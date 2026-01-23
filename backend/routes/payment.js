const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createStripePaymentIntent,
  handleCashOnDeliveryOrder,
  handleStripeWebhook,
} = require('../controllers/paymentController');

router.post('/create-stripe-intent', authMiddleware(), createStripePaymentIntent);
router.post('/confirm-cod', authMiddleware(), handleCashOnDeliveryOrder);
router.post('/stripe-webhook', handleStripeWebhook);

module.exports = router;