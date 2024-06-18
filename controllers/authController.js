const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, req) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 2000,
    ),
    httpOnly: true,
    sameSite: 'None',
    secure: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  if (req) {
    req.session.token = token;
  }

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res, req);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please Provide Email and Password'), 400);
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password'), 401);
  }

  createSendToken(user, 200, res, req);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting the Jason Web Token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access'),
      401,
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists'),
      401,
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

module.exports.restrictTo = (...roles) => {
  // In the tourRoutes file in the delete route we pass in the authorized users
  // which then come in as an array to restrictTo
  // if the req.user.role which is passed from the previous middleware doesn't include
  // the the priveleged "Names" we return an error if not we call next allowing them to access the controller function
  return (req, res, next) => {
    // this function will get access to the roles paramater
    // this happens because of closure
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have authorization to perform this action'),
        403,
      );
      // 403 means authorization fobiddance
    }
    next();
  };
};

exports.sessionAuth = catchAsync(async (req, res, next) => {
  if (req.session.token) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.session.token,
        process.env.JWT_SECRET,
      );

      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next(
          new AppError(
            'The user belonging to this token no longer exists',
            401,
          ),
        );
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
          new AppError(
            'User recently changed password. Please log in again later',
            401,
          ),
        );
      }
      res.locals.user = currentUser;
      res.locals.isAuthenticated = true;
      req.user = currentUser;

      next();
    } catch (err) {
      console.error(err);
      throw err;
    }
  } else {
    next();
  }
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt || req.session.token) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt || req.session.token,
        process.env.JWT_SECRET,
      );
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      res.locals.user = currentUser;
      return next(); // this may have resolved this issue
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    const emailSender = new Email(user, resetURL);

    await emailSender.sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error(err.message);
    return next(new AppError(err.message, 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired'), 400);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  createSendToken(user, 200, res);
});
