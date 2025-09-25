const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createStripePaymentIntent,
  handleCashOnDeliveryOrder,
  handleStripeWebhook,
} = require('../controllers/paymentController');

// 1. Route for customers to create a Stripe payment intent for a booking
router.post('/create-stripe-intent', authMiddleware(), createStripePaymentIntent);

// 2. Route for customers to confirm a Cash on Delivery booking
router.post('/confirm-cod', authMiddleware(), handleCashOnDeliveryOrder);

// 3. Stripe Webhook Route
// This route is special: Stripe needs the raw request body to verify the signature.
// We also place it before any other middleware that might parse the body (like express.json).
// We'll configure this specific route in server.js to use express.raw().
router.post('/stripe-webhook', handleStripeWebhook);

module.exports = router;