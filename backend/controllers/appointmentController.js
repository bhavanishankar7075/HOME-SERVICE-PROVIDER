const asyncHandler = require('express-async-handler');
const Appointment = require('../models/Appointment');

const createAppointment = asyncHandler(async (req, res) => {
  const { providerId, customerId, serviceId, scheduledTime } = req.body;

  if (!providerId || !customerId || !serviceId || !scheduledTime) {
    throw new Error('Missing required fields: providerId, customerId, serviceId, or scheduledTime');
  }

  const appointment = await Appointment.create({
    providerId,
    customerId,
    serviceId,
    scheduledTime,
  });

  if (global.io) {
    global.io.emit('appointmentUpdated', appointment); // Notify all connected clients
    global.io.to(providerId.toString()).emit('newAppointment', { appointment });
  }

  res.status(201).json(appointment);
});

const getAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find()
    .populate('providerId', 'name email profile')
    .populate('customerId', 'name email profile')
    .populate('serviceId', 'name price')
    .lean();
  res.json(appointments.map(app => ({
    ...app,
    providerId: {
      ...app.providerId,
      profile: { ...app.providerId.profile, image: app.providerId.profile.image ? `/uploads/${app.providerId.profile.image}` : '' },
    },
    customerId: {
      ...app.customerId,
      profile: { ...app.customerId.profile, image: app.customerId.profile.image ? `/uploads/${app.customerId.profile.image}` : '' },
    },
  })));
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { appointmentId, status } = req.body;

  if (!status) throw new Error('Status is required');

  const appointment = await Appointment.findByIdAndUpdate(
    appointmentId,
    { status },
    { new: true, runValidators: true }
  ).populate('providerId', 'name email profile')
   .populate('customerId', 'name email profile')
   .populate('serviceId', 'name price')
   .lean();

  if (!appointment) throw new Error('Appointment not found');

  if (global.io) {
    global.io.emit('appointmentUpdated', {
      ...appointment,
      providerId: {
        ...appointment.providerId,
        profile: { ...appointment.providerId.profile, image: appointment.providerId.profile.image ? `/uploads/${appointment.providerId.profile.image}` : '' },
      },
      customerId: {
        ...appointment.customerId,
        profile: { ...appointment.customerId.profile, image: appointment.customerId.profile.image ? `/uploads/${appointment.customerId.profile.image}` : '' },
      },
    });
  }

  res.json(appointment);
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await Appointment.findById(id)
    .populate('providerId', 'name email profile')
    .populate('customerId', 'name email profile')
    .populate('serviceId', 'name price')
    .lean();

  if (!appointment) throw new Error('Appointment not found');

  res.json({
    ...appointment,
    providerId: {
      ...appointment.providerId,
      profile: { ...appointment.providerId.profile, image: appointment.providerId.profile.image ? `/uploads/${appointment.providerId.profile.image}` : '' },
    },
    customerId: {
      ...appointment.customerId,
      profile: { ...appointment.customerId.profile, image: appointment.customerId.profile.image ? `/uploads/${appointment.customerId.profile.image}` : '' },
    },
  });
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await Appointment.findByIdAndDelete(id);

  if (!appointment) throw new Error('Appointment not found');

  if (global.io) {
    global.io.emit('appointmentDeleted', { _id: id });
  }

  res.json({ message: 'Appointment deleted successfully' });
});

module.exports = { createAppointment, getAppointments, updateAppointmentStatus, getAppointmentById, deleteAppointment };