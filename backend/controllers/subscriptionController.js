const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Booking = require('../models/Booking');

const createSubscription = asyncHandler(async (req, res) => {
  const { planType, revenuePercentage, paymentDetails } = req.body;

  if (req.user.role !== 'provider' && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only providers or admins can create subscriptions');
  }

  const provider = await User.findById(req.user._id);
  if (!provider || provider.role !== 'provider') {
    res.status(404);
    throw new Error('Provider not found');
  }

  const existingSubscription = await Subscription.findOne({ 
    provider: req.user._id, 
    paymentStatus: { $in: ['pending', 'completed'] } 
  });
  if (existingSubscription) {
    res.status(400);
    throw new Error('Provider already has an active subscription');
  }

  const subscription = await Subscription.create({
    provider: req.user._id,
    planType: planType || 'basic',
    revenuePercentage: revenuePercentage || 0.1,
    paymentStatus: 'pending',
    paymentDetails: paymentDetails || { mockTransactionId: `txn_${Date.now()}` },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  await User.findByIdAndUpdate(req.user._id, { $set: { subscription: subscription._id } });

  console.log(`[createSubscription] Created subscription for provider ${req.user._id}:`, {
    id: subscription._id,
    planType: subscription.planType,
    paymentStatus: subscription.paymentStatus
  });

  if (global.io) {
    global.io.to(req.user._id.toString()).to('admin_room').emit('subscriptionCreated', {
      subscription,
      providerId: req.user._id.toString(),
      providerName: provider.name,
      message: `New subscription created for provider ${provider.name}`
    });
  }

  res.status(201).json(subscription);
});

const getMySubscription = asyncHandler(async (req, res) => {
  if (req.user.role !== 'provider') {
    res.status(403);
    throw new Error('Only providers can access their subscriptions');
  }

  const subscription = await Subscription.findOne({ 
    provider: req.user._id, 
    paymentStatus: { $in: ['pending', 'completed'] } 
  }).populate('provider', 'name email');

  console.log(`[getMySubscription] Fetched subscription for provider ${req.user._id}:`, subscription ? {
    id: subscription._id,
    planType: subscription.planType,
    paymentStatus: subscription.paymentStatus
  } : 'None');

  res.json(subscription || null);
});

const getAllSubscriptions = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can access all subscriptions');
  }

  const subscriptions = await Subscription.find()
    .populate('provider', 'name email profile')
    .sort({ createdAt: -1 });

  console.log(`[getAllSubscriptions] Fetched ${subscriptions.length} subscriptions for admin ${req.user._id}`);
  res.json(subscriptions);
});

const updateSubscription = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can update subscriptions');
  }

  const { planType, revenuePercentage, paymentStatus } = req.body;
  const subscription = await Subscription.findById(req.params.id).populate('provider', 'name email profile');
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (planType) subscription.planType = planType;
  if (revenuePercentage) subscription.revenuePercentage = revenuePercentage;
  if (paymentStatus) subscription.paymentStatus = paymentStatus;
  subscription.paymentDetails = { mockTransactionId: `txn_${Date.now()}` };

  await subscription.save();

  console.log(`[updateSubscription] Updated subscription ${req.params.id}:`, {
    id: subscription._id,
    planType: subscription.planType,
    paymentStatus: subscription.paymentStatus
  });

  if (global.io) {
    global.io.to(subscription.provider._id.toString()).to('admin_room').emit('subscriptionUpdated', {
      subscription,
      providerId: subscription.provider._id.toString(),
      providerName: subscription.provider.name,
      message: `Subscription updated for provider ${subscription.provider.name}`
    });
  }

  res.json(subscription);
});

const deleteSubscription = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can delete subscriptions');
  }

  const subscription = await Subscription.findById(req.params.id).populate('provider', 'name email');
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  await User.findByIdAndUpdate(subscription.provider._id, { $unset: { subscription: '' } });
  await subscription.deleteOne();

  console.log(`[deleteSubscription] Deleted subscription ${req.params.id} for provider ${subscription.provider._id}`);

  if (global.io) {
    global.io.to(subscription.provider._id.toString()).to('admin_room').emit('subscriptionDeleted', {
      subscriptionId: req.params.id,
      providerId: subscription.provider._id.toString(),
      providerName: subscription.provider.name,
      message: `Subscription deleted for provider ${subscription.provider.name}`
    });
  }

  res.json({ message: 'Subscription deleted successfully' });
});

const getProviderRevenue = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can access provider revenue');
  }

  const providerId = req.params.providerId;
  const user = await User.findById(providerId).populate('subscription');
  if (!user || user.role !== 'provider') {
    res.status(404);
    throw new Error('Provider not found');
  }

  const subscription = await Subscription.findOne({ 
    provider: providerId, 
    paymentStatus: { $in: ['pending', 'completed'] } 
  });
  const startDate = subscription ? subscription.startDate : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const bookings = await Booking.find({
    provider: providerId,
    status: 'completed',
    scheduledTime: { $gte: startDate }
  });

  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
  const subscriptionFee = subscription ? (totalRevenue * subscription.revenuePercentage) : 0;

  if (subscription && (subscription.totalRevenue !== totalRevenue || subscription.subscriptionFee !== subscriptionFee)) {
    subscription.totalRevenue = totalRevenue;
    subscription.subscriptionFee = subscriptionFee;
    subscription.paymentDetails = { mockTransactionId: `txn_${Date.now()}` };
    await subscription.save();

    if (global.io) {
      global.io.to(providerId.toString()).to('admin_room').emit('subscriptionUpdated', {
        subscription,
        providerId,
        providerName: user.name,
        message: `Subscription updated for provider ${user.name}`
      });
      global.io.to('admin_room').emit('revenueUpdated', {
        subscription,
        providerId,
        totalRevenue,
        providerName: user.name,
        message: `Revenue updated for provider ${user.name}`
      });
    }
  }

  console.log(`[getProviderRevenue] Calculated for provider ${providerId}:`, {
    totalRevenue,
    subscriptionFee,
    bookingsCount: bookings.length
  });

  res.json({ totalRevenue, subscriptionFee, bookingsCount: bookings.length, subscription });
});

module.exports = { createSubscription, getMySubscription, getAllSubscriptions, updateSubscription, deleteSubscription, getProviderRevenue };