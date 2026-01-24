
const asyncHandler = require('express-async-handler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User.js');
const Plan = require('../models/Plan.js');

const createSubscriptionSession = asyncHandler(async (req, res) => {
  const { priceId } = req.body;
  const user = req.user;

  console.log('[createSubscriptionSession] Creating session for user:', {
    userId: user._id,
    email: user.email,
    priceId
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user._id.toString(),
    customer_email: user.email,
/*     success_url: `${process.env.API_URL || 'http://localhost:5174'}/providerhome?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.API_URL || 'http://localhost:5174'}/pricing`,
 */  
success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${process.env.FRONTEND_URL}/pricing`,


  });

  console.log('[createSubscriptionSession] Session created:', { sessionId: session.id });

  res.json({ url: session.url });
});

const createCustomerPortalSession = asyncHandler(async (req, res) => {
  const user = req.user;

  console.log('[createCustomerPortalSession] Creating portal session for user:', {
    userId: user._id,
    stripeCustomerId: user.stripeCustomerId
  });

  if (!user.stripeCustomerId) {
    res.status(400);
    throw new Error('User is not a paying customer.');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
/*     return_url: `${process.env.API_URL || 'http://localhost:5174'}/providerhome?action=subscription_managed`,
 */ 

return_url: `${process.env.FRONTEND_URL}/providerhome?action=subscription_managed`,



});

  console.log('[createCustomerPortalSession] Portal session created:', { sessionId: portalSession.id });

  res.json({ url: portalSession.url });
});

const verifySubscriptionSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user._id;

  console.log('[verifySubscriptionSession] Verifying session for user:', {
    userId,
    sessionId
  });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode === 'subscription' && session.subscription) {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    console.log('[verifySubscriptionSession] Before update:', {
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
    console.log('[verifySubscriptionSession] After update:', {
      userId: updatedUser._id,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      stripeSubscriptionId: updatedUser.stripeSubscriptionId
    });

    if (global.io) {
      console.log(`[verifySubscriptionSession] Emitting subscriptionUpdated for user ${userId}`);
      global.io.to(userId.toString()).emit('subscriptionUpdated', {
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        message: 'Your subscription has been activated. You can now access premium features.'
      });
    }

    res.json(updatedUser);
  } else {
    console.log('[verifySubscriptionSession] Subscription not successful:', { sessionId });
    res.status(400).json({ message: 'Subscription not successful' });
  }
});

module.exports = {
  createSubscriptionSession,
  createCustomerPortalSession,
  verifySubscriptionSession,
};
