const stripe = require('stripe')(process.env.STRIPE_KEY);
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');

const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1-- Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2-- Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId.toString(),
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});

const createBookingCheckout = catchAsync(async (session) => {
  const tour = session.client_reference_id;

  const user = (await User.findOne({ email: session.customer_email })).id;

  const price = session.amount_total / 100;

  const booking = await Booking.create({ tour, user, price });
});

exports.webhookCheckout = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await createBookingCheckout(session);
    } catch (err) {
      console.error(`Failed to create booking: ${err.message}`);
    }
  }

  res.status(200).json({ received: true });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
