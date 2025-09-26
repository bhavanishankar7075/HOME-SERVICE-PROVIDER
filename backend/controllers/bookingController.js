const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');
const axios = require('axios'); // Ensure axios is imported
// In-memory cache for Distance Matrix results (consider Redis for persistence)
const distanceCache = new Map();

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

  // --- FIX IS HERE ---
  // We've added timeSlot to the list of allowed fields.
  timeSlot: Joi.string()
    .pattern(new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')) // Validates HH:mm format
    .optional() // Makes the field optional
    .messages({
      'string.pattern.base': 'Time slot must be in a valid HH:mm format (e.g., 09:00 or 14:30)',
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
   console.log("--- 1. ENTERED createBooking CONTROLLER ---");
    console.log("Request Body:", req.body);
  // --- Joi Validation ---
  const { error } = bookingValidationSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // MODIFICATION 1: Destructure 'timeSlot' from the request body.
  const { serviceId, scheduledTime, location, paymentMethod, isImmediate, timeSlot } = req.body;

  // --- Find Service ---
   console.log("--- 2. FINDING SERVICE ---");
  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
 console.log("--- 3. SERVICE FOUND ---", service.name);
  // --- Find Customer & Check Profile ---
  const customer = await User.findById(req.user._id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer profile not found');
  }
  if (!customer.name || !customer.email || !customer.phone || !customer.profile) {
    res.status(400);
    throw new Error('Please complete your profile (name, email, phone, and profile details) before booking');
  }

  // --- Validate Availability (if not an immediate booking) ---
  if (!isImmediate) {
     console.log("--- 4. VALIDATING TIME SLOT ---");
    // MODIFICATION 2: Use 
    // 'timeSlot' for robust, server-independent validation.
    // This logic no longer depends on the server's local timezone.
    const bookingDate = new Date(scheduledTime);
    const dateStr = bookingDate.toISOString().split('T')[0]; // e.g., "2025-09-26"
    const availableTimes = service.availableSlots.get(dateStr) || [];
console.log(`Checking for slot '${timeSlot}' in [${availableTimes}] on date ${dateStr}`);
    // Check if the provided timeSlot is valid and exists in the available slots.
    if (!timeSlot || !availableTimes.includes(timeSlot)) {
        res.status(400);
        throw new Error(`The selected time slot ${timeSlot || ''} is no longer available for ${dateStr}. Please select another time.`);
    }
 console.log("--- 5. TIME SLOT IS VALID, UPDATING AVAILABILITY ---");
    // Remove the booked slot from the service's availability.
    service.availableSlots.set(dateStr, availableTimes.filter(time => time !== timeSlot));
    if (service.availableSlots.get(dateStr).length === 0) {
      service.availableSlots.delete(dateStr);
    }
    await service.save();
    console.log("--- 6. SERVICE AVAILABILITY SAVED ---");
  }
 console.log("--- 7. CREATING BOOKING DOCUMENT ---");
  // --- Create the Booking ---
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
      profileImage: customer.profile?.image || '/images/default-user.png',
    },
    paymentDetails: {
      method: paymentMethod,
      status: 'pending',
    },
    status: 'pending',
  });
  console.log("--- 8. BOOKING DOCUMENT CREATED ---", booking._id);

  // --- Update User's Profile ---
  await User.updateOne(
    { _id: req.user._id },
    {
      $push: {
        'profile.bookedServices': serviceId,
        'profile.appointments': {
          bookingId: booking._id,
          serviceId: serviceId,
          scheduledTime,
          status: 'pending'
        }
      }
    }
  );

  console.log('Booking Created Successfully:', { bookingId: booking._id });

  // --- Emit Socket Events for Real-time Updates ---
  if (global.io) {
    // Notify the customer
    global.io.to(req.user._id.toString()).emit('bookingStatusUpdate', {
      bookingId: booking._id,
      message: `Your booking for ${service.name} is confirmed and is pending provider assignment`,
      newStatus: 'pending',
    });
    // Notify admins
    global.io.to('admin_room').emit('newPendingBooking', {
      message: `New booking #${booking._id.toString().slice(-6)} needs a provider`,
      bookingDetails: booking,
    });
  }
console.log("--- 9. SENDING SUCCESS RESPONSE ---");
  // --- Send Response ---
  res.status(201).json(booking);
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
    imagePath: work.customer?.profile?.image || '/images/default-user.png',
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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
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

  if (serviceId || scheduledTime) {
    await User.updateOne(
      { _id: booking.customer, 'profile.appointments.bookingId': booking._id },
      {
        $set: {
          'profile.appointments.$.serviceId': serviceId || booking.service,
          'profile.appointments.$.scheduledTime': scheduledTime || booking.scheduledTime
        }
      }
    );
  }

  console.log('Booking Updated:', {
    bookingId: updatedBooking._id,
    customerId: updatedBooking.customer?._id,
    customerName: updatedBooking.customer?.name,
    profileExists: !!updatedBooking.customer?.profile,
    profileImage: updatedBooking.customer?.profile?.image || '/images/default-user.png',
  });

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  await Booking.findByIdAndDelete(req.params.id);
  await User.updateOne(
    { _id: booking.customer },
    {
      $pull: {
        'profile.bookedServices': booking.service,
        'profile.appointments': { bookingId: booking._id }
      }
    }
  );

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  if (!['in-progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }

  booking.status = status;
  await booking.save();

  await User.updateOne(
    { _id: booking.customer, 'profile.appointments.bookingId': booking._id },
    { $set: { 'profile.appointments.$.status': status } }
  );

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  booking.status = 'in-progress';
  await booking.save();

  await User.updateOne(
    { _id: booking.customer, 'profile.appointments.bookingId': booking._id },
    { $set: { 'profile.appointments.$.status': 'in-progress' } }
  );

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  booking.status = 'rejected';
  await booking.save();

  await User.updateOne(
    { _id: booking.customer, 'profile.appointments.bookingId': booking._id },
    { $set: { 'profile.appointments.$.status': 'rejected' } }
  );

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${req.params.id}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  if (!['pending', 'assigned'].includes(booking.status)) {
    res.status(400);
    throw new Error('Booking can only be cancelled if it is pending or assigned');
  }

  booking.status = 'cancelled';
  await booking.save();

  await User.updateOne(
    { _id: booking.customer, 'profile.appointments.bookingId': booking._id },
    { $set: { 'profile.appointments.$.status': 'cancelled' } }
  );

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

  if (!booking.customer) {
    console.log(`Invalid booking customer: trackingId=${trackingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
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
