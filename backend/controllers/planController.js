const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Plan = require('../models/Plan.js');
const User = require('../models/User.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new subscription plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
  const { name, price, currency, features } = req.body;

  if (!name || !price || !features || !Array.isArray(features) || features.length === 0) {
    res.status(400);
    throw new Error('Please provide name, price, and a non-empty array of features for the plan.');
  }

  // Validate name against allowed enum values
  if (!['Pro', 'Elite'].includes(name)) {
    res.status(400);
    throw new Error('Plan name must be either "Pro" or "Elite".');
  }

  // Check for existing plan with the same name
  const existingPlan = await Plan.findOne({ name });
  if (existingPlan) {
    res.status(400);
    throw new Error('A plan with this name already exists.');
  }

  // Create a "Product" in Stripe
  const product = await stripe.products.create({
    name: name,
  });

  // Create a "Price" for that Product in Stripe
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100),
    currency: currency || 'inr',
    recurring: { interval: 'month' },
  });

  // Save the plan details to MongoDB
  const plan = new Plan({
    name,
    price,
    currency: currency || 'inr',
    features,
    stripeProductId: product.id,
    stripePriceId: stripePrice.id,
  });

  const createdPlan = await plan.save();
  console.log(`[createPlan] Created plan ${name} with Stripe product ID ${product.id}, price ID ${stripePrice.id}`);
  res.status(201).json(createdPlan);
});

// @desc    Get all subscription plans
// @route   GET /api/plans
// @access  Private/Admin, Provider
const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({}).select('-__v');
  console.log('[getPlans] Fetched plans:', plans.length);
  res.json(plans);
});

// @desc    Update a subscription plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, currency, features } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid plan ID');
  }

  if (!name || !price || !features || !Array.isArray(features) || features.length === 0) {
    res.status(400);
    throw new Error('Please provide name, price, and a non-empty array of features for the plan.');
  }

  // Validate name against allowed enum values
  if (!['Pro', 'Elite'].includes(name)) {
    res.status(400);
    throw new Error('Plan name must be either "Pro" or "Elite".');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  // Check if the new name is already taken by another plan
  const existingPlan = await Plan.findOne({ name, _id: { $ne: id } });
  if (existingPlan) {
    res.status(400);
    throw new Error('A plan with this name already exists.');
  }

  // Update Stripe product and price
  try {
    // Use stripeProductId if available, otherwise fetch from Stripe
    let productId = plan.stripeProductId;
    if (!productId) {
      const price = await stripe.prices.retrieve(plan.stripePriceId);
      productId = price.product;
      plan.stripeProductId = productId;
      await plan.save();
      console.log(`[updatePlan] Retrieved product ID ${productId} for plan ${id}`);
    }

    // Update Stripe product name
    await stripe.products.update(productId, {
      name,
    });

    // Create a new price in Stripe (since prices are immutable)
    const stripePrice = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(price * 100),
      currency: currency || 'inr',
      recurring: { interval: 'month' },
    });

    // Archive the old price
    await stripe.prices.update(plan.stripePriceId, { active: false });

    // Update plan in MongoDB
    plan.name = name;
    plan.price = price;
    plan.currency = currency || 'inr';
    plan.features = features;
    plan.stripePriceId = stripePrice.id;

    const updatedPlan = await plan.save();
    console.log(`[updatePlan] Updated plan ${id} with Stripe product ID ${productId}, new price ID ${stripePrice.id}`);
    res.json(updatedPlan);
  } catch (error) {
    console.error(`[updatePlan] Stripe error for plan ${id}:`, error.message);
    res.status(500);
    throw new Error('Failed to update plan in Stripe');
  }
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

  // Check if any users are subscribed to this plan
  const activeSubscriptions = await User.find({ 'subscription.stripePriceId': plan.stripePriceId });
  if (activeSubscriptions.length > 0) {
    res.status(400);
    throw new Error('Cannot delete plan with active subscriptions');
  }

  // Archive the Stripe product
  try {
    const productId = plan.stripeProductId || (await stripe.prices.retrieve(plan.stripePriceId)).product;
    await stripe.products.update(productId, { active: false });
    console.log(`[deletePlan] Archived Stripe product ${productId} for plan ${id}`);
  } catch (error) {
    console.error(`[deletePlan] Stripe error for plan ${id}:`, error.message);
    res.status(500);
    throw new Error('Failed to archive plan in Stripe');
  }

  // Delete plan from MongoDB
  await plan.deleteOne();
  console.log(`[deletePlan] Deleted plan ${id} from MongoDB`);
  res.json({ message: 'Plan deleted successfully' });
});

module.exports = {
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
};


































































































/* 
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Plan = require('../models/Plan.js');
const User = require('../models/User.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new subscription plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
  const { name, price, currency, features } = req.body;

  if (!name || !price || !features || !Array.isArray(features) || features.length === 0) {
    res.status(400);
    throw new Error('Please provide name, price, and a non-empty array of features for the plan.');
  }

  // Validate name against allowed enum values
  if (!['Pro', 'Elite'].includes(name)) {
    res.status(400);
    throw new Error('Plan name must be either "Pro" or "Elite".');
  }

  // Check for existing plan with the same name
  const existingPlan = await Plan.findOne({ name });
  if (existingPlan) {
    res.status(400);
    throw new Error('A plan with this name already exists.');
  }

  // Create a "Product" in Stripe
  const product = await stripe.products.create({
    name: name,
  });

  // Create a "Price" for that Product in Stripe
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100),
    currency: currency || 'inr',
    recurring: { interval: 'month' },
  });

  // Save the plan details to MongoDB
  const plan = new Plan({
    name,
    price,
    currency: currency || 'inr',
    features,
    stripeProductId: product.id, // Save product ID
    stripePriceId: stripePrice.id,
  });

  const createdPlan = await plan.save();
  console.log(`[createPlan] Created plan ${name} with Stripe product ID ${product.id}, price ID ${stripePrice.id}`);
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
  const { name, price, currency, features } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid plan ID');
  }

  if (!name || !price || !features || !Array.isArray(features) || features.length === 0) {
    res.status(400);
    throw new Error('Please provide name, price, and a non-empty array of features for the plan.');
  }

  // Validate name against allowed enum values
  if (!['Pro', 'Elite'].includes(name)) {
    res.status(400);
    throw new Error('Plan name must be either "Pro" or "Elite".');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    res.status(404);
    throw new Error('Plan not found');
  }

  // Check if the new name is already taken by another plan
  const existingPlan = await Plan.findOne({ name, _id: { $ne: id } });
  if (existingPlan) {
    res.status(400);
    throw new Error('A plan with this name already exists.');
  }

  // Update Stripe product and price
  try {
    // Use stripeProductId if available, otherwise fetch from Stripe
    let productId = plan.stripeProductId;
    if (!productId) {
      const price = await stripe.prices.retrieve(plan.stripePriceId);
      productId = price.product;
      plan.stripeProductId = productId;
      await plan.save();
      console.log(`[updatePlan] Retrieved product ID ${productId} for plan ${id}`);
    }

    // Update Stripe product name
    await stripe.products.update(productId, {
      name,
    });

    // Create a new price in Stripe (since prices are immutable)
    const stripePrice = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(price * 100),
      currency: currency || 'inr',
      recurring: { interval: 'month' },
    });

    // Archive the old price
    await stripe.prices.update(plan.stripePriceId, { active: false });

    // Update plan in MongoDB
    plan.name = name;
    plan.price = price;
    plan.currency = currency || 'inr';
    plan.features = features;
    plan.stripePriceId = stripePrice.id;

    const updatedPlan = await plan.save();
    console.log(`[updatePlan] Updated plan ${id} with Stripe product ID ${productId}, new price ID ${stripePrice.id}`);
    res.json(updatedPlan);
  } catch (error) {
    console.error(`[updatePlan] Stripe error for plan ${id}:`, error.message);
    res.status(500);
    throw new Error('Failed to update plan in Stripe');
  }
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

  // Check if any users are subscribed to this plan
  const activeSubscriptions = await User.find({ 'subscription.stripePriceId': plan.stripePriceId });
  if (activeSubscriptions.length > 0) {
    res.status(400);
    throw new Error('Cannot delete plan with active subscriptions');
  }

  // Archive the Stripe product
  try {
    const productId = plan.stripeProductId || (await stripe.prices.retrieve(plan.stripePriceId)).product;
    await stripe.products.update(productId, { active: false });
    console.log(`[deletePlan] Archived Stripe product ${productId} for plan ${id}`);
  } catch (error) {
    console.error(`[deletePlan] Stripe error for plan ${id}:`, error.message);
    res.status(500);
    throw new Error('Failed to archive plan in Stripe');
  }

  // Delete plan from MongoDB
  await plan.deleteOne();
  console.log(`[deletePlan] Deleted plan ${id} from MongoDB`);
  res.json({ message: 'Plan deleted successfully' });
});

module.exports = {
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
}; */



























































/* // backend/controllers/planController.js

const asyncHandler = require('express-async-handler');
const Plan = require('../models/Plan.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new subscription plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = asyncHandler(async (req, res) => {
  const { name, price, currency, features } = req.body;

  if (!name || !price || !features) {
    res.status(400);
    throw new Error('Please provide name, price, and features for the plan.');
  }

  // 1. Create a "Product" in Stripe
  const product = await stripe.products.create({
    name: name,
  });

  // 2. Create a "Price" for that Product in Stripe
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: price * 100, // Price in smallest currency unit (e.g., paise for INR)
    currency: currency || 'inr',
    recurring: { interval: 'month' },
  });

  // 3. Save the plan details to your own database
  const plan = new Plan({
    name: name,
    price: price,
    currency: currency || 'inr',
    features: features,
    stripePriceId: stripePrice.id,
  });

  const createdPlan = await plan.save();
  res.status(201).json(createdPlan);
});

// @desc    Get all subscription plans
// @route   GET /api/plans
// @access  Private/Admin
const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({});
  res.json(plans);
});

module.exports = {
  createPlan,
  getPlans,
}; */