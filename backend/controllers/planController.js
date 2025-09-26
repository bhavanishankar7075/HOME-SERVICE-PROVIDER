const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Plan = require('../models/Plan.js');
const User = require('../models/User.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new subscription plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
  // --- UPDATED: Now accepts 'bookingLimit' from the request body ---
  const { name, price, currency, features, bookingLimit } = req.body;

  if (!name || price === undefined || !features || !Array.isArray(features) || features.length === 0 || bookingLimit === undefined) {
    res.status(400);
    throw new Error('Please provide name, price, features, and a booking limit for the plan.');
  }

  if (!['Pro', 'Elite'].includes(name)) {
    res.status(400);
    throw new Error('Plan name must be either "Pro" or "Elite".');
  }

  const existingPlan = await Plan.findOne({ name });
  if (existingPlan) {
    res.status(400);
    throw new Error('A plan with this name already exists.');
  }

  const product = await stripe.products.create({
    name: name,
  });

  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100),
    currency: currency || 'inr',
    recurring: { interval: 'month' },
  });

  const plan = new Plan({
    name,
    price,
    currency: currency || 'inr',
    features,
    stripeProductId: product.id,
    stripePriceId: stripePrice.id,
    bookingLimit: bookingLimit, // --- ADDED: Save the booking limit ---
  });

  const createdPlan = await plan.save();
  res.status(201).json(createdPlan);
});

// @desc    Get all subscription plans
// @route   GET /api/plans
// @access  Private/Admin, Provider
const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({}).select('-__v');
  res.json(plans);
});

// @desc    Update a subscription plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // --- UPDATED: Now accepts 'bookingLimit' for updates ---
  const { name, price, currency, features, bookingLimit } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid plan ID');
  }

  if (!name || price === undefined || !features || !Array.isArray(features) || features.length === 0 || bookingLimit === undefined) {
    res.status(400);
    throw new Error('Please provide name, price, features, and a booking limit.');
  }
  
  const plan = await Plan.findById(id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }
  
  // --- THIS SECTION IS A SIMPLIFIED UPDATE AND DOES NOT UPDATE STRIPE ---
  // A full implementation would archive the old price and create a new one in Stripe.
  // For simplicity in this step, we will only update our local database.
  plan.name = name;
  plan.price = price;
  plan.currency = currency || 'inr';
  plan.features = features;
  plan.bookingLimit = bookingLimit; // --- ADDED: Update the booking limit ---
  
  const updatedPlan = await plan.save();
  res.json(updatedPlan);
});

// @desc    Delete a subscription plan
// @route   DELETE /api/plans/:id
// @access  Private/Admin
const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid plan ID');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  // Check if any users are subscribed to this plan's price ID
  const activeSubscriptions = await User.countDocuments({ stripeSubscriptionId: { $ne: null }, subscriptionTier: plan.name.toLowerCase() });
  if (activeSubscriptions > 0) {
    res.status(400);
    throw new Error(`Cannot delete plan. ${activeSubscriptions} provider(s) are currently subscribed.`);
  }

  // Archive the Stripe product if it exists
  try {
    if (plan.stripeProductId) {
        await stripe.products.update(plan.stripeProductId, { active: false });
    }
  } catch (error) {
    console.error(`Stripe error for plan ${id}:`, error.message);
    // Do not throw error, just log it. We still want to delete from our DB.
  }

  await plan.deleteOne();
  res.json({ message: 'Plan deleted successfully' });
});

module.exports = {
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
};

