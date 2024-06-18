const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/').get(authController.isLoggedIn, viewsController.getOverview);

router.route('/login').get(viewsController.getLoginForm);

router
  .route('/tours/:tourSlug')
  .get(authController.isLoggedIn, viewsController.getTour);

router.get('/me', authController.protect, viewsController.getAccount);

router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData,
);

module.exports = router;
