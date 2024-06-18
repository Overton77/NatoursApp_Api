const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate field value: ${err.keyValue.name} Please use another value`;
  return new AppError(message, 400);
};

const handleJWTExpired = () =>
  new AppError('Your token has expired please log in again', 401);

const handleJWTError = () =>
  new AppError('Invalid Token. Please log in again', 401);

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // API related ERROR
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  console.error('ERROR!', err.stack);

  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Log error
    console.error('ERROR!!!', err.stack);
    // 2 Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
  if (err.isOperational) {
    console.log(err);

    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      msg: err.message,
    });
  }
  // Log error
  console.error('ERROR!!!', err.stack);
  // 2 Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpired();

    sendErrorProd(error, req, res);
  }
};
