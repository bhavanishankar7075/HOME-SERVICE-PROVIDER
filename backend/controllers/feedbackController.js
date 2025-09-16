const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Joi = require('joi');

const feedbackSchema = Joi.object({
  bookingId: Joi.string().required().messages({
    'string.empty': 'Booking ID is required',
    'any.required': 'Booking ID is required',
  }),
  comment: Joi.string().required().messages({
    'string.empty': 'Comment is required',
    'any.required': 'Comment is required',
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
});

const createFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating } = req.body;

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to provide feedback for this booking');
  }
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Feedback can only be provided for completed bookings');
  }
  if (booking.feedback) {
    res.status(400);
    throw new Error('Feedback already submitted for this booking');
  }

  const feedback = await Feedback.create({
    userId: req.user._id,
    bookingId,
    providerId: booking.provider,
    comment,
    rating,
    approved: false,
  });

  await Booking.findByIdAndUpdate(bookingId, { feedback: feedback._id });
  await User.updateOne(
    { _id: req.user._id },
    { $push: { 'profile.feedback': feedback._id } }
  );

  const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: booking.service._id }).distinct('_id') } });
  const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
  await Service.findByIdAndUpdate(booking.service._id, {
    averageRating: avgRating,
    $inc: { feedbackCount: 1 },
  });

  const populatedFeedback = await Feedback.findById(feedback._id)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  console.log('Feedback Created:', {
    feedbackId: populatedFeedback._id,
    bookingId: populatedFeedback.bookingId?._id,
    customerId: populatedFeedback.bookingId?.customer?._id || 'N/A',
    customerName: populatedFeedback.bookingId?.customer?.name || 'Unknown',
    profileExists: !!populatedFeedback.bookingId?.customer?.profile,
    imagePath: populatedFeedback.bookingId?.customer?.profile?.image || '/images/default-user.png',
  });

  if (global.io) {
    global.io.emit('feedbacksUpdated', populatedFeedback);
    if (booking.provider) {
      global.io.to(booking.provider.toString()).emit('feedbackSubmitted', {
        feedback: populatedFeedback,
        bookingId,
        serviceName: booking.service.name,
      });
    }
  }

  res.status(201).json(populatedFeedback);
});

const getFeedbacks = asyncHandler(async (req, res) => {
  const query = req.user.role === 'provider' ? { providerId: req.user._id } : {};
  const feedbacks = await Feedback.find(query)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  console.log('Feedbacks Fetched:', feedbacks.map(f => ({
    feedbackId: f._id,
    bookingId: f.bookingId?._id,
    customerId: f.bookingId?.customer?._id || 'N/A',
    customerName: f.bookingId?.customer?.name || 'Unknown',
    profileExists: !!f.bookingId?.customer?.profile,
    imagePath: f.bookingId?.customer?.profile?.image || '/images/default-user.png',
  })));

  res.json(feedbacks);
});

const updateFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating } = req.body;
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this feedback');
  }

  let serviceId;
  if (bookingId) {
    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (!booking.customer) {
      console.log(`Invalid booking customer: bookingId=${bookingId}`);
      res.status(400);
      throw new Error('Booking has no valid customer');
    }
    feedback.bookingId = bookingId;
    feedback.providerId = booking.provider;
    serviceId = booking.service._id;
  }
  if (comment) feedback.comment = comment;
  if (rating) feedback.rating = rating;

  await feedback.save();

  if (serviceId && rating) {
    const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: serviceId }).distinct('_id') } });
    const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
    await Service.findByIdAndUpdate(serviceId, { averageRating: avgRating });
  }

  const populatedFeedback = await Feedback.findById(req.params.id)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  console.log('Feedback Updated:', {
    feedbackId: populatedFeedback._id,
    bookingId: populatedFeedback.bookingId?._id,
    customerId: populatedFeedback.bookingId?.customer?._id || 'N/A',
    customerName: populatedFeedback.bookingId?.customer?.name || 'Unknown',
    profileExists: !!populatedFeedback.bookingId?.customer?.profile,
    imagePath: populatedFeedback.bookingId?.customer?.profile?.image || '/images/default-user.png',
  });

  if (global.io && populatedFeedback.providerId) {
    global.io.emit('feedbacksUpdated', populatedFeedback);
    global.io.to(populatedFeedback.providerId.toString()).emit('feedbackUpdated', populatedFeedback);
  }

  res.json(populatedFeedback);
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this feedback');
  }

  const booking = await Booking.findById(feedback.bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Associated booking not found');
  }
  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${feedback.bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  await Booking.findByIdAndUpdate(feedback.bookingId, { $unset: { feedback: '' } });
  await User.updateOne(
    { _id: feedback.userId },
    { $pull: { 'profile.feedback': feedback._id } }
  );
  await Feedback.findByIdAndDelete(req.params.id);

  if (booking.service) {
    const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: booking.service }).distinct('_id') } });
    const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
    await Service.findByIdAndUpdate(booking.service, {
      averageRating: avgRating,
      $inc: { feedbackCount: -1 },
    });
  }

  console.log('Feedback Deleted:', {
    feedbackId: req.params.id,
    bookingId: feedback.bookingId,
    customerId: booking.customer?._id || 'N/A',
    customerName: booking.customer?.name || 'Unknown',
    profileExists: !!booking.customer?.profile,
    imagePath: booking.customer?.profile?.image || '/images/default-user.png',
  });

  if (global.io && feedback.providerId) {
    global.io.emit('feedbacksUpdated', { feedbackId: req.params.id });
    global.io.to(feedback.providerId.toString()).emit('feedbackDeleted', { feedbackId: req.params.id });
  }

  res.json({ message: 'Feedback deleted' });
});

module.exports = { createFeedback, getFeedbacks, updateFeedback, deleteFeedback };















































/*  const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Joi = require('joi');

const feedbackSchema = Joi.object({
  bookingId: Joi.string().required().messages({
    'string.empty': 'Booking ID is required',
    'any.required': 'Booking ID is required',
  }),
  comment: Joi.string().required().messages({
    'string.empty': 'Comment is required',
    'any.required': 'Comment is required',
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
});

const createFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating } = req.body;

  // Validate booking
  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to provide feedback for this booking');
  }
  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('Feedback can only be provided for completed bookings');
  }
  if (booking.feedback) {
    res.status(400);
    throw new Error('Feedback already submitted for this booking');
  }

  const feedback = await Feedback.create({
    userId: req.user._id,
    bookingId,
    providerId: booking.provider,
    comment,
    rating,
  });

  // Link feedback to booking
  await Booking.findByIdAndUpdate(bookingId, { feedback: feedback._id });

  // Update service average rating
  const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: booking.service._id }).distinct('_id') } });
  const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
  await Service.findByIdAndUpdate(booking.service._id, {
    averageRating: avgRating,
    $inc: { feedbackCount: 1 },
  });

  // Populate feedback for response
  const populatedFeedback = await Feedback.findById(feedback._id)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  // Debug logging
  console.log('Feedback Created:', {
    feedbackId: populatedFeedback._id,
    bookingId: populatedFeedback.bookingId?._id,
    customerId: populatedFeedback.bookingId?.customer?._id,
    customerName: populatedFeedback.bookingId?.customer?.name,
    profileExists: !!populatedFeedback.bookingId?.customer?.profile,
    imagePath: populatedFeedback.bookingId?.customer?.profile?.image,
  });

  // Emit socket event
  if (global.io) {
    global.io.emit('feedbacksUpdated', populatedFeedback);
    if (booking.provider) {
      global.io.to(booking.provider.toString()).emit('feedbackSubmitted', {
        feedback: populatedFeedback,
        bookingId,
        serviceName: booking.service.name,
      });
    }
  }

  res.status(201).json(populatedFeedback);
});

const getFeedbacks = asyncHandler(async (req, res) => {
  const query = req.user.role === 'provider' ? { providerId: req.user._id } : {};
  const feedbacks = await Feedback.find(query)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  // Debug logging
  console.log('Feedbacks Fetched:', feedbacks.map(f => ({
    feedbackId: f._id,
    bookingId: f.bookingId?._id,
    customerId: f.bookingId?.customer?._id,
    customerName: f.bookingId?.customer?.name,
    profileExists: !!f.bookingId?.customer?.profile,
    imagePath: f.bookingId?.customer?.profile?.image,
  })));

  res.json(feedbacks);
});

const updateFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating } = req.body;
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this feedback');
  }

  let serviceId;
  if (bookingId) {
    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    feedback.bookingId = bookingId;
    feedback.providerId = booking.provider;
    serviceId = booking.service._id;
  }
  if (comment) feedback.comment = comment;
  if (rating) feedback.rating = rating;

  await feedback.save();

  // Update service average rating
  if (serviceId && rating) {
    const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: serviceId }).distinct('_id') } });
    const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
    await Service.findByIdAndUpdate(serviceId, { averageRating: avgRating });
  }

  // Populate feedback for response
  const populatedFeedback = await Feedback.findById(req.params.id)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name profile' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  // Debug logging
  console.log('Feedback Updated:', {
    feedbackId: populatedFeedback._id,
    bookingId: populatedFeedback.bookingId?._id,
    customerId: populatedFeedback.bookingId?.customer?._id,
    customerName: populatedFeedback.bookingId?.customer?.name,
    profileExists: !!populatedFeedback.bookingId?.customer?.profile,
    imagePath: populatedFeedback.bookingId?.customer?.profile?.image,
  });

  if (global.io && populatedFeedback.providerId) {
    global.io.emit('feedbacksUpdated', populatedFeedback);
    global.io.to(populatedFeedback.providerId.toString()).emit('feedbackUpdated', populatedFeedback);
  }

  res.json(populatedFeedback);
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this feedback');
  }

  const booking = await Booking.findById(feedback.bookingId);
  await Booking.findByIdAndUpdate(feedback.bookingId, { $unset: { feedback: '' } });
  await Feedback.findByIdAndDelete(req.params.id);

  // Update service average rating
  if (booking && booking.service) {
    const feedbacks = await Feedback.find({ bookingId: { $in: await Booking.find({ service: booking.service }).distinct('_id') } });
    const avgRating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0;
    await Service.findByIdAndUpdate(booking.service, {
      averageRating: avgRating,
      $inc: { feedbackCount: -1 },
    });
  }

  // Debug logging
  console.log('Feedback Deleted:', {
    feedbackId: req.params.id,
    bookingId: feedback.bookingId?._id,
    customerId: booking?.customer?._id,
    profileExists: !!booking?.customer?.profile,
    imagePath: booking?.customer?.profile?.image,
  });

  if (global.io && feedback.providerId) {
    global.io.emit('feedbacksUpdated', { feedbackId: req.params.id });
    global.io.to(feedback.providerId.toString()).emit('feedbackDeleted', { feedbackId: req.params.id });
  }

  res.json({ message: 'Feedback deleted' });
});

module.exports = { createFeedback, getFeedbacks, updateFeedback, deleteFeedback }; */
 

















































/* const asyncHandler = require('express-async-handler');
const Feedback = require('../models/Feedback');
const Joi = require('joi');

const feedbackSchema = Joi.object({
  bookingId: Joi.string().required().messages({
    'string.empty': 'Booking ID is required',
    'any.required': 'Booking ID is required',
  }),
  comment: Joi.string().required().messages({
    'string.empty': 'Comment is required',
    'any.required': 'Comment is required',
  }),
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating must be at most 5',
    'any.required': 'Rating is required',
  }),
  approved: Joi.boolean().optional(),
});

const createFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating } = req.body;

  const feedback = await Feedback.create({
    userId: req.user._id,
    bookingId,
    comment,
    rating,
    approved: req.user.role === 'admin' ? true : false,
  });

  const feedbackCount = await Feedback.countDocuments();
  if (global.io) {
    global.io.emit('feedbacksUpdated', { count: feedbackCount });
  }

  res.status(201).json(feedback);
});

const getFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find()
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });
  res.json(feedbacks);
});

const updateFeedback = asyncHandler(async (req, res) => {
  const { error } = feedbackSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { bookingId, comment, rating, approved } = req.body;
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this feedback');
  }

  if (bookingId) feedback.bookingId = bookingId;
  if (comment) feedback.comment = comment;
  if (rating) feedback.rating = rating;
  if (req.user.role === 'admin' && typeof approved === 'boolean') feedback.approved = approved;

  await feedback.save();

  const populatedFeedback = await Feedback.findById(req.params.id)
    .populate('userId', 'name')
    .populate({
      path: 'bookingId',
      populate: [
        { path: 'customer', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'service', select: 'name' },
      ],
    });

  const feedbackCount = await Feedback.countDocuments();
  if (global.io) {
    global.io.emit('feedbacksUpdated', { count: feedbackCount });
  }

  res.json(populatedFeedback);
});

const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  if (feedback.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this feedback');
  }

  await Feedback.findByIdAndDelete(req.params.id);
  const feedbackCount = await Feedback.countDocuments();
  if (global.io) {
    global.io.emit('feedbacksUpdated', { count: feedbackCount });
  }

  res.json({ message: 'Feedback deleted' });
});

module.exports = { createFeedback, getFeedbacks, updateFeedback, deleteFeedback }; */