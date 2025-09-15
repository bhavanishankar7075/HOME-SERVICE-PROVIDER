const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');

const bookingValidationSchema = Joi.object({
  serviceId: Joi.string().required().messages({
    'string.empty': 'Service ID is required',
    'any.required': 'Service ID is required',
  }),
  scheduledTime: Joi.date().required().messages({
    'date.base': 'Scheduled time must be a valid date',
    'any.required': 'Scheduled time is required',
  }),
  location: Joi.string().required().messages({
    'string.empty': 'Location is required',
    'any.required': 'Location is required',
  }),
  paymentMethod: Joi.string().valid('COD', 'Stripe').required().messages({
    'any.only': 'Payment method must be either COD or Stripe',
    'any.required': 'Payment method is required',
  }),
  isImmediate: Joi.boolean().optional(),
});

const calculateRevenue = async () => {
  const result = await Booking.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result[0]?.total || 0;
};

const createBooking = asyncHandler(async (req, res) => {
  const { error } = bookingValidationSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { serviceId, scheduledTime, location, paymentMethod, isImmediate } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  const customer = await User.findById(req.user._id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer profile not found');
  }

  if (!customer.name || !customer.email || !customer.phone) {
    res.status(400);
    throw new Error('Please complete your profile (name, email, and phone number) before booking');
  }

  if (!isImmediate) {
    const bookingDate = new Date(scheduledTime);
    const dateStr = bookingDate.toISOString().split('T')[0];
    const timeStr = bookingDate.toTimeString().slice(0, 5);
    const availableTimes = service.availableSlots.get(dateStr) || [];
    if (!availableTimes.includes(timeStr)) {
      res.status(400);
      throw new Error('Selected time is not available for this service');
    }
    service.availableSlots.set(dateStr, availableTimes.filter(time => time !== timeStr));
    if (service.availableSlots.get(dateStr).length === 0) {
      service.availableSlots.delete(dateStr);
    }
    await service.save();
  }

  const booking = await Booking.create({
    customer: req.user._id,
    service: serviceId,
    scheduledTime,
    location,
    totalPrice: service.price,
    customerDetails: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    paymentDetails: {
      method: paymentMethod,
      status: 'pending',
    },
    status: 'pending',
  });

  if (global.io) {
    global.io.to(req.user._id.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `Your booking for ${service.name} is confirmed and is pending provider assignment`,
      newStatus: 'pending',
    });
    global.io.to('admin_room').emit('newPendingBooking', {
      message: `New booking #${booking._id.toString().slice(-6)} needs a provider`,
      bookingDetails: booking,
    });
  }

  res.status(201).json(booking);
});

const assignProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.body;
  const { bookingId } = req.params;

  if (!providerId) {
    res.status(400);
    throw new Error('Provider ID is required');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('This booking is not pending and cannot be assigned a provider');
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== 'provider') {
    res.status(404);
    throw new Error('Provider not found or user is not a provider');
  }

  const bookingDate = new Date(booking.scheduledTime);
  const now = new Date();
  const isImmediateBooking = Math.abs(bookingDate - now) < 5 * 60 * 1000; // Within 5 minutes

  if (!isImmediateBooking) {
    const bookingDateStr = bookingDate.toISOString().split('T')[0];
    const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);
    const availabilityString = provider.profile.availability;
    if (availabilityString && availabilityString.includes(' ')) {
      try {
        const [availDateStr, timeRangeStr] = availabilityString.split(' ');
        const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
        if (
          availDateStr !== bookingDateStr ||
          bookingTimeStr < startTimeStr ||
          bookingTimeStr > endTimeStr
        ) {
          res.status(400);
          throw new Error('Provider is not available at the scheduled time');
        }
      } catch (e) {
        console.error(`Error parsing availability for provider ${provider._id}: ${availabilityString}`);
        res.status(400);
        throw new Error('Invalid provider availability format');
      }
    } else if (availabilityString !== 'Available') {
      res.status(400);
      throw new Error('Provider availability is not set or invalid');
    }
  }

  const conflictingBookings = await Booking.find({
    provider: providerId,
    scheduledTime: {
      $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
      $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
    },
    status: { $in: ['assigned', 'in-progress'] },
  });
  if (conflictingBookings.length > 0) {
    res.status(400);
    throw new Error('Provider has a conflicting booking');
  }

  if (booking.location && provider.profile.location?.fullAddress && !booking.location.match(new RegExp(provider.profile.location.fullAddress, 'i'))) {
    res.status(400);
    throw new Error('Provider location does not match booking location');
  }

  booking.provider = providerId;
  booking.status = 'assigned';
  await booking.save();

  const populatedBooking = await Booking.findById(bookingId)
    .populate('customer', 'name email phone profile')
    .populate('service', 'name price category')
    .populate('provider', 'name email phone profile');

  if (global.io) {
    global.io.to(providerId.toString()).emit('newBookingAssigned', {
      message: `You have been assigned a new booking for ${booking.service.name}`,
      bookingId: booking._id,
    });
    global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `A provider has been assigned to your booking for ${booking.service.name}`,
      newStatus: 'assigned',
      providerName: provider.name,
    });
    global.io.to('admin_room').emit('bookingStatusUpdate', {
      message: `Booking #${booking._id.toString().slice(-6)} assigned to ${provider.name}`,
      booking: populatedBooking,
    });
  }

  res.json({ message: 'Provider assigned successfully', booking: populatedBooking });
});

const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const { service, scheduledTime, location } = booking;
  if (!scheduledTime || !location) {
    res.status(400);
    throw new Error('Booking missing scheduled time or location');
  }

  const skills = service.category ? [service.category] : [];
  if (skills.length === 0) {
    res.status(400);
    throw new Error('Service missing category');
  }

  const bookingDate = new Date(scheduledTime);
  const now = new Date();
  const isImmediateBooking = Math.abs(bookingDate - now) < 5 * 60 * 1000; // Within 5 minutes

  const locationWords = location.toLowerCase().split(/[\s,]+/);

  const providers = await User.find({
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills },
    $or: [
      { 'profile.location.fullAddress': { $regex: new RegExp(locationWords.join('|'), 'i') } },
      { 'profile.location.fullAddress': { $exists: false } },
    ],
  })
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Location: ${location}, Providers found: ${providers.length}`);

  const suitableProviders = await Promise.all(
    providers.map(async (provider) => {
      const conflictingBookings = await Booking.find({
        provider: provider._id,
        scheduledTime: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['assigned', 'in-progress'] },
      });
      if (conflictingBookings.length > 0) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Conflicting bookings`);
        return null;
      }

      if (isImmediateBooking) {
        return provider; // Skip time-specific availability for immediate bookings
      }

      const availabilityString = provider.profile.availability;
      if (!availabilityString) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: No availability`);
        return null;
      }
      if (availabilityString === 'Available') {
        return provider;
      }
      if (availabilityString.includes(' ')) {
        try {
          const [availDateStr, timeRangeStr] = availabilityString.split(' ');
          const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
          const bookingDateStr = bookingDate.toISOString().split('T')[0];
          const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);
          if (
            availDateStr === bookingDateStr &&
            bookingTimeStr >= startTimeStr &&
            bookingTimeStr <= endTimeStr
          ) {
            return provider;
          }
          console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Availability mismatch (${availabilityString})`);
        } catch (e) {
          console.error(`[findAvailableProviders] Error parsing availability for provider ${provider._id}: ${availabilityString}`);
        }
      }
      return null;
    })
  );

  const filteredProviders = suitableProviders.filter((p) => p !== null);
  console.log(`[findAvailableProviders] Suitable providers: ${filteredProviders.length}`);
  res.json(filteredProviders);
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    $or: [{ provider: req.user._id }, { customer: req.user._id }],
  }).populate('customer service provider feedback');
  res.json(bookings);
});

const getCustomerPreviousServices = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('provider', 'name')
    .populate('feedback');
  res.json(bookings);
});

const getProviderPreviousWorks = asyncHandler(async (req, res) => {
  if (req.user.role !== 'provider') {
    res.status(403);
    throw new Error('Only providers can view previous works');
  }
  const bookings = await Booking.find({ provider: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('customer', 'name profile')
    .populate('feedback');
  
  console.log('Previous Works Fetched:', bookings.map(work => ({
    bookingId: work._id,
    customerId: work.customer?._id,
    customerName: work.customer?.name,
    profileExists: !!work.customer?.profile,
    imagePath: work.customer?.profile?.image
  })));

  res.json(bookings);
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('customer service provider feedback');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }
  res.json(booking);
});

const updateBooking = asyncHandler(async (req, res) => {
  const { serviceId, scheduledTime, location } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }
    if (scheduledTime) {
      const bookingDate = new Date(scheduledTime);
      const dateStr = bookingDate.toISOString().split('T')[0];
      const timeStr = bookingDate.toTimeString().slice(0, 5);
      const availableTimes = service.availableSlots.get(dateStr) || [];
      if (!availableTimes.includes(timeStr)) {
        res.status(400);
        throw new Error('Selected time is not available for this service');
      }
    }
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    req.params.id,
    { service: serviceId, scheduledTime, location },
    { new: true, runValidators: true }
  ).populate('customer service provider feedback');

  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: updatedBooking._id,
      newStatus: updatedBooking.status,
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: updatedBooking._id,
    newStatus: updatedBooking.status,
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(updatedBooking);
});

const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this booking');
  }

  await Booking.findByIdAndDelete(req.params.id);
  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: 'cancelled',
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'cancelled',
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking deleted' });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('service');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.provider?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (!['in-progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  booking.status = status;
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
    bookingId: booking._id,
    newStatus: status,
    message: `Your booking for ${booking.service.name} has been updated to: ${status}`,
  });
  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: status,
    });
  }

  if (status === 'completed' && global.io && booking.customer) {
    global.io.to(booking.customer.toString()).emit('serviceCompleted', {
      bookingId: booking._id,
      serviceName: booking.service.name,
    });
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(booking);
});

const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to accept this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be accepted');
  }

  booking.status = 'in-progress';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'in-progress',
  });

  res.json({ message: 'Booking accepted', booking });
});

const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to reject this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be rejected');
  }

  booking.status = 'rejected';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'rejected',
  });

  res.json({ message: 'Booking rejected', booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }

  if (!['pending', 'assigned'].includes(booking.status)) {
    res.status(400);
    throw new Error('Booking can only be cancelled if it is pending or assigned');
  }

  booking.status = 'cancelled';
  await booking.save();

  if (global.io) {
    if (booking.provider) {
      global.io.to(booking.provider.toString()).emit('bookingUpdate', {
        bookingId: booking._id,
        newStatus: 'cancelled',
      });
    }
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking cancelled', booking });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find().populate('customer service provider feedback');
  res.json(bookings);
});

const trackService = asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const booking = await Booking.findOne({ trackingId }).populate('service').populate('provider').populate('feedback');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to track this booking');
  }
  res.json({ status: booking.status, feedback: booking.feedback });
});

module.exports = {
  createBooking,
  assignProvider,
  findAvailableProviders,
  getServices,
  getMyBookings,
  getCustomerPreviousServices,
  getProviderPreviousWorks,
  getBookingById,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getAllBookings,
  trackService,
};









































/* const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');

const bookingValidationSchema = Joi.object({
  serviceId: Joi.string().required().messages({
    'string.empty': 'Service ID is required',
    'any.required': 'Service ID is required',
  }),
  scheduledTime: Joi.date().required().messages({
    'date.base': 'Scheduled time must be a valid date',
    'any.required': 'Scheduled time is required',
  }),
  location: Joi.string().required().messages({
    'string.empty': 'Location is required',
    'any.required': 'Location is required',
  }),
  paymentMethod: Joi.string().valid('COD', 'Stripe').required().messages({
    'any.only': 'Payment method must be either COD or Stripe',
    'any.required': 'Payment method is required',
  }),
});

const calculateRevenue = async () => {
  const result = await Booking.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result[0]?.total || 0;
};

const createBooking = asyncHandler(async (req, res) => {
  const { error } = bookingValidationSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { serviceId, scheduledTime, location, paymentMethod } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  const bookingDate = new Date(scheduledTime);
  const dateStr = bookingDate.toISOString().split('T')[0];
  const timeStr = bookingDate.toTimeString().slice(0, 5);
  const availableTimes = service.availableSlots.get(dateStr) || [];
  if (!availableTimes.includes(timeStr)) {
    res.status(400);
    throw new Error('Selected time is not available for this service');
  }

  const customer = await User.findById(req.user._id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer profile not found');
  }

  if (!customer.name || !customer.email || !customer.phone) {
    res.status(400);
    throw new Error('Please complete your profile (name, email, and phone number) before booking');
  }

  const booking = await Booking.create({
    customer: req.user._id,
    service: serviceId,
    scheduledTime,
    location,
    totalPrice: service.price,
    customerDetails: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    paymentDetails: {
      method: paymentMethod,
      status: 'pending',
    },
    status: 'pending',
  });

  service.availableSlots.set(dateStr, availableTimes.filter(time => time !== timeStr));
  if (service.availableSlots.get(dateStr).length === 0) {
    service.availableSlots.delete(dateStr);
  }
  await service.save();

  if (global.io) {
    global.io.to(req.user._id.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `Your booking for ${service.name} is confirmed and is pending provider assignment`,
      newStatus: 'pending',
    });
    global.io.to('admin_room').emit('newPendingBooking', {
      message: `New booking #${booking._id.toString().slice(-6)} needs a provider`,
      bookingDetails: booking,
    });
  }

  res.status(201).json(booking);
});

const assignProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.body;
  const { bookingId } = req.params;

  if (!providerId) {
    res.status(400);
    throw new Error('Provider ID is required');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('This booking is not pending and cannot be assigned a provider');
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== 'provider') {
    res.status(404);
    throw new Error('Provider not found or user is not a provider');
  }

  const bookingDate = new Date(booking.scheduledTime);
  const bookingDateStr = bookingDate.toISOString().split('T')[0];
  const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);
  const availabilityString = provider.profile.availability;
  if (availabilityString && availabilityString.includes(' ')) {
    try {
      const [availDateStr, timeRangeStr] = availabilityString.split(' ');
      const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
      if (
        availDateStr !== bookingDateStr ||
        bookingTimeStr < startTimeStr ||
        bookingTimeStr > endTimeStr
      ) {
        res.status(400);
        throw new Error('Provider is not available at the scheduled time');
      }
    } catch (e) {
      console.error(`Error parsing availability for provider ${provider._id}: ${availabilityString}`);
      res.status(400);
      throw new Error('Invalid provider availability format');
    }
  } else if (availabilityString !== 'Available') {
    res.status(400);
    throw new Error('Provider availability is not set or invalid');
  }

  const conflictingBookings = await Booking.find({
    provider: providerId,
    scheduledTime: {
      $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
      $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
    },
    status: { $in: ['assigned', 'in-progress'] },
  });
  if (conflictingBookings.length > 0) {
    res.status(400);
    throw new Error('Provider has a conflicting booking');
  }

  if (booking.location && provider.profile.location?.fullAddress && !booking.location.match(new RegExp(provider.profile.location.fullAddress, 'i'))) {
    res.status(400);
    throw new Error('Provider location does not match booking location');
  }

  booking.provider = providerId;
  booking.status = 'assigned';
  await booking.save();

  const populatedBooking = await Booking.findById(bookingId)
    .populate('customer', 'name email phone profile')
    .populate('service', 'name price category')
    .populate('provider', 'name email phone profile');

  if (global.io) {
    global.io.to(providerId.toString()).emit('newBookingAssigned', {
      message: `You have been assigned a new booking for ${booking.service.name}`,
      bookingId: booking._id,
    });
    global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `A provider has been assigned to your booking for ${booking.service.name}`,
      newStatus: 'assigned',
      providerName: provider.name,
    });
    global.io.to('admin_room').emit('bookingStatusUpdate', {
      message: `Booking #${booking._id.toString().slice(-6)} assigned to ${provider.name}`,
      booking: populatedBooking,
    });
  }

  res.json({ message: 'Provider assigned successfully', booking: populatedBooking });
});

const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const { service, scheduledTime, location } = booking;
  if (!scheduledTime || !location) {
    res.status(400);
    throw new Error('Booking missing scheduled time or location');
  }

  const skills = service.category ? [service.category] : [];
  if (skills.length === 0) {
    res.status(400);
    throw new Error('Service missing category');
  }

  const bookingDate = new Date(scheduledTime);
  const bookingDateStr = bookingDate.toISOString().split('T')[0];
  const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);

  const locationWords = location.toLowerCase().split(/[\s,]+/);

  const providers = await User.find({
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills },
    $or: [
      { 'profile.location.fullAddress': { $regex: new RegExp(locationWords.join('|'), 'i') } },
      { 'profile.location.fullAddress': { $exists: false } },
    ],
  })
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Location: ${location}, Providers found: ${providers.length}`);

  const suitableProviders = await Promise.all(
    providers.map(async (provider) => {
      const conflictingBookings = await Booking.find({
        provider: provider._id,
        scheduledTime: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['assigned', 'in-progress'] },
      });
      if (conflictingBookings.length > 0) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Conflicting bookings`);
        return null;
      }

      const availabilityString = provider.profile.availability;
      if (!availabilityString) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: No availability`);
        return null;
      }
      if (availabilityString === 'Available') {
        return provider;
      }
      if (availabilityString.includes(' ')) {
        try {
          const [availDateStr, timeRangeStr] = availabilityString.split(' ');
          const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
          if (
            availDateStr === bookingDateStr &&
            bookingTimeStr >= startTimeStr &&
            bookingTimeStr <= endTimeStr
          ) {
            return provider;
          }
          console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Availability mismatch (${availabilityString})`);
        } catch (e) {
          console.error(`[findAvailableProviders] Error parsing availability for provider ${provider._id}: ${availabilityString}`);
        }
      }
      return null;
    })
  );

  const filteredProviders = suitableProviders.filter((p) => p !== null);
  console.log(`[findAvailableProviders] Suitable providers: ${filteredProviders.length}`);
  res.json(filteredProviders);
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    $or: [{ provider: req.user._id }, { customer: req.user._id }],
  }).populate('customer service provider feedback');
  res.json(bookings);
});

const getCustomerPreviousServices = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('provider', 'name')
    .populate('feedback');
  res.json(bookings);
});

const getProviderPreviousWorks = asyncHandler(async (req, res) => {
  if (req.user.role !== 'provider') {
    res.status(403);
    throw new Error('Only providers can view previous works');
  }
  const bookings = await Booking.find({ provider: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('customer', 'name profile')
    .populate('feedback');
  
  // Debug log to verify population
  console.log('Previous Works Fetched:', bookings.map(work => ({
    bookingId: work._id,
    customerId: work.customer?._id,
    customerName: work.customer?.name,
    profileExists: !!work.customer?.profile,
    imagePath: work.customer?.profile?.image
  })));

  res.json(bookings);
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('customer service provider feedback');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }
  res.json(booking);
});

const updateBooking = asyncHandler(async (req, res) => {
  const { serviceId, scheduledTime, location } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }
    if (scheduledTime) {
      const bookingDate = new Date(scheduledTime);
      const dateStr = bookingDate.toISOString().split('T')[0];
      const timeStr = bookingDate.toTimeString().slice(0, 5);
      const availableTimes = service.availableSlots.get(dateStr) || [];
      if (!availableTimes.includes(timeStr)) {
        res.status(400);
        throw new Error('Selected time is not available for this service');
      }
    }
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    req.params.id,
    { service: serviceId, scheduledTime, location },
    { new: true, runValidators: true }
  ).populate('customer service provider feedback');

  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: updatedBooking._id,
      newStatus: updatedBooking.status,
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: updatedBooking._id,
    newStatus: updatedBooking.status,
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(updatedBooking);
});

const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this booking');
  }

  await Booking.findByIdAndDelete(req.params.id);
  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: 'cancelled',
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'cancelled',
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking deleted' });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('service');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.provider?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (!['in-progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  booking.status = status;
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
    bookingId: booking._id,
    newStatus: status,
    message: `Your booking for ${booking.service.name} has been updated to: ${status}`,
  });
  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: status,
    });
  }

  if (status === 'completed' && global.io && booking.customer) {
    global.io.to(booking.customer.toString()).emit('serviceCompleted', {
      bookingId: booking._id,
      serviceName: booking.service.name,
    });
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(booking);
});

const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to accept this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be accepted');
  }

  booking.status = 'in-progress';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'in-progress',
  });

  res.json({ message: 'Booking accepted', booking });
});

const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to reject this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be rejected');
  }

  booking.status = 'rejected';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'rejected',
  });

  res.json({ message: 'Booking rejected', booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }

  if (!['pending', 'assigned'].includes(booking.status)) {
    res.status(400);
    throw new Error('Booking can only be cancelled if it is pending or assigned');
  }

  booking.status = 'cancelled';
  await booking.save();

  if (global.io) {
    if (booking.provider) {
      global.io.to(booking.provider.toString()).emit('bookingUpdate', {
        bookingId: booking._id,
        newStatus: 'cancelled',
      });
    }
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking cancelled', booking });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find().populate('customer service provider feedback');
  res.json(bookings);
});

const trackService = asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const booking = await Booking.findOne({ trackingId }).populate('service').populate('provider').populate('feedback');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to track this booking');
  }
  res.json({ status: booking.status, feedback: booking.feedback });
});

module.exports = {
  createBooking,
  assignProvider,
  findAvailableProviders,
  getServices,
  getMyBookings,
  getCustomerPreviousServices,
  getProviderPreviousWorks,
  getBookingById,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getAllBookings,
  trackService,
}; */































































/*
 const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');

const bookingValidationSchema = Joi.object({
  serviceId: Joi.string().required().messages({
    'string.empty': 'Service ID is required',
    'any.required': 'Service ID is required',
  }),
  scheduledTime: Joi.date().required().messages({
    'date.base': 'Scheduled time must be a valid date',
    'any.required': 'Scheduled time is required',
  }),
  location: Joi.string().required().messages({
    'string.empty': 'Location is required',
    'any.required': 'Location is required',
  }),
  paymentMethod: Joi.string().valid('COD', 'Stripe').required().messages({
    'any.only': 'Payment method must be either COD or Stripe',
    'any.required': 'Payment method is required',
  })
});

const calculateRevenue = async () => {
  const result = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'serviceData',
      },
    },
    { $unwind: '$serviceData' },
    { $group: { _id: null, total: { $sum: '$serviceData.price' } } },
  ]);
  return result[0]?.total || 0;
};

const createBooking = asyncHandler(async (req, res) => {
  const { error } = bookingValidationSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { serviceId, scheduledTime, location, paymentMethod } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  const customer = await User.findById(req.user._id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer profile not found');
  }

  if (!customer.name || !customer.email || !customer.phone) {
      res.status(400);
      throw new Error('Please complete your profile (name, email, and phone number) before booking');
  }

  const booking = await Booking.create({
    customer: req.user._id,
    service: serviceId,
    scheduledTime,
    location,
    totalPrice: service.price,
    customerDetails: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    },
    paymentDetails: {
      method: paymentMethod,
      status: 'pending',
    },
    status: 'pending',
  });

  if (global.io) {
    global.io.to(req.user._id.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `Your booking for ${service.name} is confirmed and is pending provider assignment`,
      newStatus: 'pending',
    });
    global.io.to('admin_room').emit('newPendingBooking', {
      message: `New booking #${booking._id.toString().slice(-6)} needs a provider`,
      bookingDetails: booking,
    });
  }

  res.status(201).json(booking);
});

const assignProvider = asyncHandler(async (req, res) => {
  const { providerId } = req.body;
  const { bookingId } = req.params;

  if (!providerId) {
    res.status(400);
    throw new Error('Provider ID is required');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    res.status(400);
    throw new Error('This booking is not pending and cannot be assigned a provider');
  }

  const provider = await User.findById(providerId);
  if (!provider || provider.role !== 'provider') {
    res.status(404);
    throw new Error('Provider not found or user is not a provider');
  }

  // Check provider availability
  const bookingDate = new Date(booking.scheduledTime);
  const bookingDateStr = bookingDate.toISOString().split('T')[0];
  const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);
  const availabilityString = provider.profile.availability;
  if (availabilityString && availabilityString.includes(' ')) {
    try {
      const [availDateStr, timeRangeStr] = availabilityString.split(' ');
      const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
      if (
        availDateStr !== bookingDateStr ||
        bookingTimeStr < startTimeStr ||
        bookingTimeStr > endTimeStr
      ) {
        res.status(400);
        throw new Error('Provider is not available at the scheduled time');
      }
    } catch (e) {
      console.error(`Error parsing availability for provider ${provider._id}: ${availabilityString}`);
      res.status(400);
      throw new Error('Invalid provider availability format');
    }
  } else if (availabilityString !== 'Available') {
    res.status(400);
    throw new Error('Provider availability is not set or invalid');
  }

  // Check for conflicting bookings
  const conflictingBookings = await Booking.find({
    provider: providerId,
    scheduledTime: {
      $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
      $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
    },
    status: { $in: ['assigned', 'in-progress'] },
  });
  if (conflictingBookings.length > 0) {
    res.status(400);
    throw new Error('Provider has a conflicting booking');
  }

  // Check location match
  if (booking.location && provider.profile.location?.fullAddress && !booking.location.match(new RegExp(provider.profile.location.fullAddress, 'i'))) {
    res.status(400);
    throw new Error('Provider location does not match booking location');
  }

  booking.provider = providerId;
  booking.status = 'assigned';
  await booking.save();

  const populatedBooking = await Booking.findById(bookingId)
    .populate('customer', 'name email phone')
    .populate('service', 'name price category')
    .populate('provider', 'name email phone profile');

  if (global.io) {
    global.io.to(providerId.toString()).emit('newBookingAssigned', {
      message: `You have been assigned a new booking for ${booking.service.name}`,
      bookingId: booking._id,
    });
    global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `A provider has been assigned to your booking for ${booking.service.name}`,
      newStatus: 'assigned',
      providerName: provider.name,
    });
    global.io.to('admin_room').emit('bookingStatusUpdate', {
      message: `Booking #${booking._id.toString().slice(-6)} assigned to ${provider.name}`,
      booking: populatedBooking,
    });
  }

  res.json({ message: 'Provider assigned successfully', booking: populatedBooking });
});

const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const { service, scheduledTime, location } = booking;
  if (!scheduledTime || !location) {
    res.status(400);
    throw new Error('Booking missing scheduled time or location');
  }

  const skills = service.requiredSkills || (service.category ? [service.category] : []);
  if (skills.length === 0) {
    res.status(400);
    throw new Error('Service missing required skills or category');
  }

  const bookingDate = new Date(scheduledTime);
  const bookingDateStr = bookingDate.toISOString().split('T')[0];
  const bookingTimeStr = bookingDate.toTimeString().slice(0, 5);

  // Normalize location for matching
  const locationWords = location.toLowerCase().split(/[\s,]+/);

  // Query providers
  const providers = await User.find({
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills },
    $or: [
      { 'profile.location.fullAddress': { $regex: new RegExp(locationWords.join('|'), 'i') } },
      { 'profile.location.fullAddress': { $exists: false } },
    ],
  })
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Location: ${location}, Providers found: ${providers.length}`);

  // Filter providers
  const suitableProviders = await Promise.all(
    providers.map(async (provider) => {
      // Check for conflicting bookings
      const conflictingBookings = await Booking.find({
        provider: provider._id,
        scheduledTime: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['assigned', 'in-progress'] },
      });
      if (conflictingBookings.length > 0) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Conflicting bookings`);
        return null;
      }

      // Check availability
      const availabilityString = provider.profile.availability;
      if (!availabilityString) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: No availability`);
        return null;
      }
      if (availabilityString === 'Available') {
        return provider;
      }
      if (availabilityString.includes(' ')) {
        try {
          const [availDateStr, timeRangeStr] = availabilityString.split(' ');
          const [startTimeStr, endTimeStr] = timeRangeStr.split('-');
          if (
            availDateStr === bookingDateStr &&
            bookingTimeStr >= startTimeStr &&
            bookingTimeStr <= endTimeStr
          ) {
            return provider;
          }
          console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Availability mismatch (${availabilityString})`);
        } catch (e) {
          console.error(`[findAvailableProviders] Error parsing availability for provider ${provider._id}: ${availabilityString}`);
        }
      }
      return null;
    })
  );

  const filteredProviders = suitableProviders.filter((p) => p !== null);
  console.log(`[findAvailableProviders] Suitable providers: ${filteredProviders.length}`);
  res.json(filteredProviders);
});

const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find();
  res.json(services);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    $or: [{ provider: req.user._id }, { customer: req.user._id }],
  }).populate('customer service provider');
  res.json(bookings);
});

const getCustomerPreviousServices = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('provider', 'name');
  res.json(bookings);
});

const getProviderPreviousWorks = asyncHandler(async (req, res) => {
  if (req.user.role !== 'provider') {
    res.status(403);
    throw new Error('Only providers can view previous works');
  }
  const bookings = await Booking.find({ provider: req.user._id, status: 'completed' })
    .populate('service', 'name')
    .populate('customer', 'name');
  res.json(bookings);
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('customer service provider');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }
  res.json(booking);
});

const updateBooking = asyncHandler(async (req, res) => {
  const { serviceId, scheduledTime, location } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    req.params.id,
    { service: serviceId, scheduledTime, location },
    { new: true, runValidators: true }
  ).populate('customer service provider');

  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: updatedBooking._id,
      newStatus: updatedBooking.status,
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: updatedBooking._id,
    newStatus: updatedBooking.status,
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(updatedBooking);
});

const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this booking');
  }

  await Booking.findByIdAndDelete(req.params.id);
  if(booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: 'cancelled',
    });
  }
  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'cancelled',
  });

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking deleted' });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id).populate('service');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.provider?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  if (!['in-progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  booking.status = status;
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
    bookingId: booking._id,
    newStatus: status,
    message: `Your booking for ${booking.service.name} has been updated to: ${status}`
  });
  if (booking.provider) {
    global.io.to(booking.provider.toString()).emit('bookingUpdate', {
      bookingId: booking._id,
      newStatus: status,
    });
  }

  if (status === 'completed' && global.io && booking.customer) {
    global.io.to(booking.customer.toString()).emit('serviceCompleted', {
      bookingId: booking._id,
      serviceName: booking.service.name,
    });
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json(booking);
});

const acceptBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to accept this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be accepted');
  }

  booking.status = 'in-progress';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'in-progress',
  });

  res.json({ message: 'Booking accepted', booking });
});

const rejectBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.provider?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to reject this booking');
  }

  if (booking.status !== 'assigned') {
    res.status(400);
    throw new Error('Booking must be in "assigned" state to be rejected');
  }

  booking.status = 'rejected';
  await booking.save();

  global.io.to(booking.customer.toString()).emit('bookingUpdate', {
    bookingId: booking._id,
    newStatus: 'rejected',
  });

  res.json({ message: 'Booking rejected', booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }

  if (!['pending', 'assigned'].includes(booking.status)) {
    res.status(400);
    throw new Error('Booking can only be cancelled if it is pending or assigned');
  }

  booking.status = 'cancelled';
  await booking.save();

  if (global.io) {
    if (booking.provider) {
      global.io.to(booking.provider.toString()).emit('bookingUpdate', {
        bookingId: booking._id,
        newStatus: 'cancelled',
      });
    }
  }

  const revenue = await calculateRevenue();
  if (global.io) {
    global.io.emit('revenueUpdated', { total: revenue });
  }

  res.json({ message: 'Booking cancelled', booking });
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find().populate('customer service provider');
  res.json(bookings);
});

const trackService = asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const booking = await Booking.findOne({ trackingId }).populate('service').populate('provider');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  
  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isProvider = booking.provider && booking.provider.toString() === req.user._id.toString();

  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to track this booking');
  }
  res.json({ status: booking.status });
});

module.exports = {
  createBooking,
  assignProvider,
  findAvailableProviders,
  getServices,
  getMyBookings,
  getCustomerPreviousServices,
  getProviderPreviousWorks,
  getBookingById,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getAllBookings,
  trackService,
};
  */