const mongoose = require('mongoose');
const crypto = require('crypto');

const validator = require('validator');
const slugify = require('slugify');

const bcrypt = require('bcryptjs');

const opts = { toJSON: { virtuals: true }, toObject: { virtuals: true } };

const userSchema = new mongoose.Schema(
  {
    name: {
      required: [true, 'User must have a name'],
      type: String,
      maxLength: 100,
      minLength: 2,
    },

    email: {
      required: [true, 'User must have an email'],
      type: String,
      maxLength: 100,
      minLength: 5,
      unique: true,
      lowercase: true,
      validate: [
        validator.isEmail,
        'Please provide a valid email. It must include the default format xxxx@xxxx.com',
      ],
    },

    photo: {
      type: String,
      default: 'default.jpg',
    },

    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
    },

    password: {
      required: [true, 'User must have a password'],
      type: String,
      maxLength: 150,
      minLength: 8,
      select: false,
    },

    passwordConfirm: {
      required: [true, 'User must confirm password'],
      type: String,
      maxLength: 200,
      minLength: 8,
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: 'Passwords are not the same',
      },
    },
    passwordChangedAt: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },

  opts,
);

userSchema.pre('save', function (next) {
  this.nameSlug = slugify(this.name, { lower: true });
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;

  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
