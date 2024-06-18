const { promisify } = require('util');
const axios = require('axios');

const jwt = require('jsonwebtoken');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../models/bookingModel');

const User = require('../models/userModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();

  res.status(200).render('overview', {
    title: 'All Tours ',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Find the tour and populate the reviews the guides are automatically populated

  if (!req.params.tourSlug) {
    return next(
      new AppError('Tour paramater must be included for identification', 400),
    );
  }

  const tour = await Tour.findOne({ slug: req.params.tourSlug }).populate({
    path: 'reviews',
    select: 'review rating user',
  });

  if (!tour || req.originalUrl.toString().split('/').at(-1) !== tour.slug) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  res.status(200).render('tour', {
    title: tour.name,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log in to your account',
  });
};

exports.handleLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const tours = await Tour.find();

  try {
    const response = await axios.post(
      'http://127.0.0.1:3000/api/v1/users/login',
      {
        email,
        password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      },
    );
    const { token } = response.data;

    req.session.token = token;

    res.status(200).render('overview', {
      title: 'All Tours',
      tours,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;

  let userId;
  if (req.user) {
    userId = req.user._id;
  } else if (res.locals.user) {
    userId = res.locals.user._id;
  } else if (req.cookies.jwt) {
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );
    userId = decoded.id;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        name: name,
        email: email,
      },
    },
    { new: true, runValidators: true },
  );

  res.status(200).render('account', {
    title: 'Your Account',
    user: updatedUser,
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const tourIds = bookings.map((el) => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
