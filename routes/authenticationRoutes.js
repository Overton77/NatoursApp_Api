const express = require('express');
const viewsController = require('../controllers/viewsController');

const router = express.Router();

router.route('/login-post').post(viewsController.handleLogin);

module.exports = router;
