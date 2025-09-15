const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Joi = require('joi');

// Ensure Stripe is initialized
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe initialized successfully');
} else {
  console.error('CRITICAL: STRIPE_SECRET_KEY is not defined in .env. Stripe payments will fail.');
}

// Validation schema for creating a Stripe payment intent
const stripeIntentSchema = Joi.object({
  bookingId: Joi.string().required().messages({
    'string.empty': 'Booking ID is required',
    'any.required': 'Booking ID is required',
  }),
});

// 1. Create or Retrieve Stripe Payment Intent
const createStripePaymentIntent = asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(500);
    throw new Error('Stripe payment service is not available');
  }

  const { error } = stripeIntentSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId } = req.body;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not authorized to pay for this booking');
  }
  if (booking.paymentDetails.method !== 'Stripe') {
    res.status(400);
    throw new Error('This booking is not designated for a Stripe payment.');
  }

  const amount = Math.round(booking.totalPrice * 100);
  let paymentIntent;

  if (booking.paymentDetails.stripePaymentIntentId) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentDetails.stripePaymentIntentId);
      if (paymentIntent.amount !== amount) {
          paymentIntent = await stripe.paymentIntents.update(booking.paymentDetails.stripePaymentIntentId, { amount });
      }
    } catch (retrieveError) {
        console.warn(`Could not retrieve existing PaymentIntent. Creating a new one.`, retrieveError.message);
        paymentIntent = null;
    }
  }
  
  if (!paymentIntent) {
    paymentIntent = await stripe.paymentIntents.create({
      amount,
      // CORRECTED: Set back to Indian Rupees
      currency: 'inr', 
      // This will only accept card until your Indian account is approved and you add 'upi' back
      payment_method_types: ['card'],
      metadata: { bookingId: bookingId.toString() },
      description: `Payment for Booking #${booking._id.toString().slice(-6)}`,
    });

    booking.paymentDetails.stripePaymentIntentId = paymentIntent.id;
    await booking.save();
  }

  res.json({
    clientSecret: paymentIntent.client_secret,
    bookingId: booking._id,
  });
});

// 2. Handle Cash on Delivery (COD) Orders
const handleCashOnDeliveryOrder = asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        res.status(400);
        throw new Error('Booking ID is required');
    }

    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }
    if (booking.customer.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('You are not authorized for this booking');
    }
    if (booking.paymentDetails.method !== 'COD') {
        res.status(400);
        throw new Error('This booking is not designated for Cash on Delivery.');
    }

    booking.paymentDetails.status = 'completed';
    await booking.save();

    if (global.io) {
        global.io.to('admin_room').emit('newPaidBooking', {
            message: `COD Booking for ${booking.service.name} is confirmed and ready for provider assignment.`,
            bookingDetails: booking,
        });
    }

    res.json({ message: 'COD order confirmed successfully. Awaiting provider assignment.', booking });
});

// 3. Handle Stripe Webhook Events
const handleStripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not defined.');
        }
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { bookingId } = paymentIntent.metadata;

        const booking = await Booking.findById(bookingId).populate('service');
        if (booking) {
            booking.paymentDetails.status = 'completed';
            await booking.save();

            if (global.io) {
                global.io.to('admin_room').emit('newPaidBooking', {
                    message: `Stripe payment for ${booking.service.name} was successful. Booking ready for provider assignment.`,
                    bookingDetails: booking,
                });
            }
            console.log(`Payment succeeded for Booking ID: ${bookingId}`);
        }
    } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const { bookingId } = paymentIntent.metadata;
        
        const booking = await Booking.findById(bookingId);
        if (booking) {
            booking.paymentDetails.status = 'failed';
            await booking.save();
            console.log(`Payment failed for Booking ID: ${bookingId}`);
        }
    }
    
    res.json({ received: true });
});

module.exports = {
  createStripePaymentIntent,
  handleCashOnDeliveryOrder,
  handleStripeWebhook,
};