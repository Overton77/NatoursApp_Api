const express = require('express');
const cors = require('cors');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const corsOptions = {
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
};

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);

router.patch(
  '/updateMyPassword',
  cors(corsOptions),

  authController.updatePassword,
);

router.get(
  '/me',

  userController.getMe,
  userController.getUser,
);
router.patch(
  '/updateMe',
  cors(corsOptions),
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
