const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Joi = require('joi');

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe initialized successfully');
} else {
  console.error('CRITICAL: STRIPE_SECRET_KEY is not defined in .env. Stripe payments will fail.');
}

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
      currency: 'inr',
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

  console.log('[Webhook] Received event:', event.type);

  // Handle one-time payment events
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { bookingId } = paymentIntent.metadata;

    const booking = await Booking.findById(bookingId).populate('service');
    if (booking) {
      booking.paymentDetails.status = 'completed';
      await booking.save();
      if (global.io) {
        global.io.to('admin_room').emit('newPaidBooking', {
          message: `Stripe payment for ${booking.service.name} was successful.`,
          bookingDetails: booking,
        });
      }
      console.log('[Webhook] Payment succeeded for booking:', bookingId);
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const { bookingId } = paymentIntent.metadata;
    const booking = await Booking.findById(bookingId);
    if (booking) {
      booking.paymentDetails.status = 'failed';
      await booking.save();
      console.log('[Webhook] Payment failed for booking:', bookingId);
    }
  }

  // Handle Subscription Events
  else if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const user = await User.findById(userId);
    if (user) {
      console.log('[Webhook] Before checkout.session.completed update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.stripeCustomerId = session.customer;
      user.stripeSubscriptionId = session.subscription;
      user.subscriptionStatus = 'active';
      user.subscriptionStartDate = new Date(); // --- ADDED: Set start date for booking limit reset ---
      user.currentBookingCount = 0; // --- ADDED: Reset booking count on new subscription ---

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0].price.id;
      const plan = await Plan.findOne({ stripePriceId: priceId });

      if (plan) {
        user.subscriptionTier = plan.name.toLowerCase();
      }
      await user.save();

      const updatedUser = await User.findById(userId).select('-password');
      console.log('[Webhook] After checkout.session.completed update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${userId}`);
        global.io.to(userId.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus,
          message: 'Your subscription has been activated. You can now access premium features.'
        });
      }
    }
  }
  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (user) {
      console.log('[Webhook] Before customer.subscription.updated update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.subscriptionStatus = subscription.status;
      if (subscription.cancel_at_period_end) {
        user.subscriptionStatus = 'canceled';
        user.subscriptionTier = 'free';
        user.stripeSubscriptionId = null;
      } else if (subscription.status === 'active') {
        user.subscriptionStartDate = new Date(); // --- ADDED: Reset start date on renewal ---
        user.currentBookingCount = 0; // --- ADDED: Reset booking count on renewal ---
      } else if (subscription.status === 'past_due') {
        // --- ADDED: Handle past due (e.g., notify provider) ---
        if (global.io) {
          global.io.to(user._id.toString()).emit('subscriptionWarning', {
            message: 'Your subscription payment is past due. Please update your payment method to avoid cancellation.'
          });
        }
      }
      await user.save();

      const updatedUser = await User.findById(user._id).select('-password');
      console.log('[Webhook] After customer.subscription.updated update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${user._id}`);
        global.io.to(user._id.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus,
          message: subscription.status === 'past_due' ? 'Your subscription is past due. Please update payment.' : 'Your subscription has been updated.'
        });
      }
    }
  }
  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (user) {
      console.log('[Webhook] Before customer.subscription.deleted update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.subscriptionStatus = 'canceled';
      user.subscriptionTier = 'free';
      user.stripeSubscriptionId = null;
      user.subscriptionStartDate = null; // --- ADDED: Clear start date ---
      user.currentBookingCount = 0; // --- ADDED: Reset booking count ---
      await user.save();

      const updatedUser = await User.findById(user._id).select('-password');
      console.log('[Webhook] After customer.subscription.deleted update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${user._id}`);
        global.io.to(user._id.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus,
          message: 'Your subscription has expired or been canceled. You have been downgraded to the free plan.'
        });
      }
    }
  }

  console.log('[Webhook] Event processed:', event.type);
  res.json({ received: true });
});

module.exports = {
  createStripePaymentIntent,
  handleCashOnDeliveryOrder,
  handleStripeWebhook,
};









































































//main
/* const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Joi = require('joi');

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe initialized successfully');
} else {
  console.error('CRITICAL: STRIPE_SECRET_KEY is not defined in .env. Stripe payments will fail.');
}

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
      currency: 'inr',
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

  console.log('[Webhook] Received event:', event.type);

  // Handle one-time payment events
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { bookingId } = paymentIntent.metadata;

    const booking = await Booking.findById(bookingId).populate('service');
    if (booking) {
      booking.paymentDetails.status = 'completed';
      await booking.save();
      if (global.io) {
        global.io.to('admin_room').emit('newPaidBooking', {
          message: `Stripe payment for ${booking.service.name} was successful.`,
          bookingDetails: booking,
        });
      }
      console.log('[Webhook] Payment succeeded for booking:', bookingId);
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const { bookingId } = paymentIntent.metadata;
    const booking = await Booking.findById(bookingId);
    if (booking) {
      booking.paymentDetails.status = 'failed';
      await booking.save();
      console.log('[Webhook] Payment failed for booking:', bookingId);
    }
  }

  // Handle Subscription Events
  else if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const user = await User.findById(userId);
    if (user) {
      console.log('[Webhook] Before checkout.session.completed update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.stripeCustomerId = session.customer;
      user.stripeSubscriptionId = session.subscription;
      user.subscriptionStatus = 'active';

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0].price.id;
      const plan = await Plan.findOne({ stripePriceId: priceId });

      if (plan) {
        user.subscriptionTier = plan.name.toLowerCase();
      }
      await user.save();

      const updatedUser = await User.findById(userId).select('-password');
      console.log('[Webhook] After checkout.session.completed update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${userId}`);
        global.io.to(userId.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus
        });
      }
    }
  }
  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (user) {
      console.log('[Webhook] Before customer.subscription.updated update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.subscriptionStatus = subscription.status;
      if (subscription.cancel_at_period_end) {
        user.subscriptionStatus = 'canceled';
        user.subscriptionTier = 'free';
        user.stripeSubscriptionId = null;
      }
      await user.save();

      const updatedUser = await User.findById(user._id).select('-password');
      console.log('[Webhook] After customer.subscription.updated update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${user._id}`);
        global.io.to(user._id.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus
        });
      }
    }
  }
  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (user) {
      console.log('[Webhook] Before customer.subscription.deleted update:', {
        userId: user._id,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId
      });

      user.subscriptionStatus = 'canceled';
      user.subscriptionTier = 'free';
      user.stripeSubscriptionId = null;
      await user.save();

      const updatedUser = await User.findById(user._id).select('-password');
      console.log('[Webhook] After customer.subscription.deleted update:', {
        userId: updatedUser._id,
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        stripeSubscriptionId: updatedUser.stripeSubscriptionId
      });

      if (global.io) {
        console.log(`[Webhook] Emitting subscriptionUpdated for user ${user._id}`);
        global.io.to(user._id.toString()).emit('subscriptionUpdated', {
          subscriptionTier: updatedUser.subscriptionTier,
          subscriptionStatus: updatedUser.subscriptionStatus
        });
      }
    }
  }

  console.log('[Webhook] Event processed:', event.type);
  res.json({ received: true });
});

module.exports = {
  createStripePaymentIntent,
  handleCashOnDeliveryOrder,
  handleStripeWebhook,
}; */
