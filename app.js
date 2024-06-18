const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // Will enable in production
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

// Start express app
const app = express();

// app.enable("trust proxy") For Certain Deployments

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Implement CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
};
app.use(cors(corsOptions));

app.options('*', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.post(
  '/api/v1/bookings/stripe-webhook',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

// Development logging

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 300,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Session and Flash
app.use(
  session({
    secret: 'whatanamazingsecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(flash());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use((req, res, next) => {
  res.locals.messages = flash();
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

// Set security HTTP headers
// This will be enabled In Production. It is very important to enumerate
// all Content Security Policy directives as they can block data requests

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'", 'data:', 'https:'],
//         scriptSrc: [
//           "'self'",
//           'https://js.stripe.com',
//           'https://api.mapbox.com',
//           "'unsafe-inline'",
//         ],
//         styleSrc: [
//           "'self'",
//           'https://fonts.googleapis.com',
//           'https://api.mapbox.com',
//           "'unsafe-inline'",
//         ],
//         imgSrc: [
//           "'self'",
//           'data:',
//           'https://*.stripe.com',
//           'https://*.mapbox.com',
//           'http://localhost:3000/img',
//         ],
//         connectSrc: [
//           "'self'",
//           'https://api.mapbox.com',
//           'https://events.mapbox.com',
//           'http://localhost:3000',
//           'http://127.0.0.1:3000',
//         ],
//         fontSrc: [
//           "'self'",
//           'https://fonts.googleapis.com',
//           'https://fonts.gstatic.com',
//         ],
//         workerSrc: ["'self'", 'blob:'],
//         frameSrc: ["'self'", 'https://js.stripe.com'],
//         objectSrc: ["'none'"], // Only needed if you use <object> elements
//         upgradeInsecureRequests: [],
//         // Add other directives as needed
//       },
//     },
//   }),
// );
