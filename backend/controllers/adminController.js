const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const Service = require('../models/Service'); // <-- ADDED: Service model is needed for slot management
const mongoose = require('mongoose');
const Log = require('../models/Log');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.getUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json(users.map(user => ({
      ...user,
      profile: {
        ...user.profile,
        image: user.profile.image ? user.profile.image : '',
        feedback: user.profile.feedback || [],
        bookedServices: user.profile.bookedServices || []
      },
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  try {
    const { role, profile } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, profile }, { new: true, runValidators: true })
      .select('-password');
    if (user) {
      await Log.create({
        userId: user._id,
        userName: user.name,
        action: 'updated role',
        details: `Role changed to ${role}`,
      });
      global.io.emit('userUpdated', user.toObject());
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user role', error: error.message });
  }
});

exports.updateUser = asyncHandler(async (req, res) => {
  try {
    const { name, phone, profile, email } = req.body;
    const updatedProfile = {
      ...profile,
      feedback: Array.isArray(profile?.feedback) ? profile.feedback.map(fb => ({
        serviceId: mongoose.Types.ObjectId.isValid(fb.serviceId) ? fb.serviceId : null,
        feedback: fb.feedback || ''
      }).filter(fb => fb.serviceId)) : [],
      bookedServices: Array.isArray(profile?.bookedServices) ? profile.bookedServices.filter(id => mongoose.Types.ObjectId.isValid(id)) : [],
      location: profile?.location ? {
        fullAddress: profile.location.fullAddress || null,
        details: {
          streetNumber: profile.location.details?.streetNumber || '',
          street: profile.location.details?.street || '',
          city: profile.location.details?.city || '',
          state: profile.location.details?.state || '',
          country: profile.location.details?.country || '',
          postalCode: profile.location.details?.postalCode || ''
        }
      } : undefined
    };
    const user = await User.findByIdAndUpdate(req.params.id, { name, phone, profile: updatedProfile, email }, { new: true, runValidators: true })
      .select('-password');
    if (user) {
      await Log.create({
        userId: user._id,
        userName: user.name,
        action: 'updated profile',
        details: `Updated name: ${name}, email: ${email}`,
      });
      global.io.emit('userUpdated', user.toObject());
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user', error: error.message });
  }
});

exports.deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) {
      await Log.create({
        userId: user._id,
        userName: user.name,
        action: 'deleted',
        details: 'User account deleted',
      });
      global.io.emit('userDeleted', { _id: req.params.id });
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

exports.getAppointments = asyncHandler(async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('providerId', 'name email profile')
      .populate('customerId', 'name email profile')
      .populate('serviceId', 'name price')
      .lean();
    res.json(appointments.map(app => ({
      ...app,
      providerId: {
        ...app.providerId,
        profile: { ...app.providerId.profile, image: app.providerId.profile.image ? app.providerId.profile.image : '' },
      },
      customerId: {
        ...app.customerId,
        profile: { ...app.customerId.profile, image: app.customerId.profile.image ? app.customerId.profile.image : '' },
      },
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

exports.updateAppointment = asyncHandler(async (req, res) => {
  try {
    const { status, scheduledTime } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status, scheduledTime }, { new: true, runValidators: true })
      .populate('providerId', 'name email profile')
      .populate('customerId', 'name email profile')
      .populate('serviceId', 'name price')
      .lean();
    if (appointment) {
      await Log.create({
        userId: appointment.providerId._id || appointment.customerId._id,
        userName: appointment.providerId.name || appointment.customerId.name,
        action: 'updated appointment',
        details: `Status changed to ${status}, Time: ${scheduledTime}`,
      });
      global.io.emit('appointmentUpdated', {
        ...appointment,
        providerId: {
          ...appointment.providerId,
          profile: { ...appointment.providerId.profile, image: appointment.providerId.profile.image ? appointment.providerId.profile.image : '' },
        },
        customerId: {
          ...app.customerId,
          profile: { ...appointment.customerId.profile, image: appointment.customerId.profile.image ? appointment.customerId.profile.image : '' },
        },
      });
      res.json(appointment);
    } else {
      res.status(404).json({ message: 'Appointment not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating appointment', error: error.message });
  }
});

exports.deleteAppointment = asyncHandler(async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (appointment) {
      await Log.create({
        userId: appointment.providerId || appointment.customerId,
        userName: appointment.providerId.name || appointment.customerId.name,
        action: 'deleted appointment',
        details: 'Appointment deleted',
      });
      global.io.emit('appointmentDeleted', { _id: req.params.id });
      res.json({ message: 'Appointment deleted successfully' });
    } else {
      res.status(404).json({ message: 'Appointment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting appointment', error: error.message });
  }
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profile.status = user.profile.status === 'active' ? 'inactive' : 'active';
    const updatedUser = await user.save();

    await Log.create({
      userId: user._id,
      userName: user.name,
      action: 'toggled status',
      details: `Status changed to ${user.profile.status}`,
    });

    if (global.io) {
      global.io.emit('userUpdated', updatedUser.toObject());
    }

    res.json({ status: updatedUser.profile.status });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling status', error: error.message });
  }
});
  
exports.toggleAvailability = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profile.availability = user.profile.availability === 'Available' ? 'Unavailable' : 'Available';
    const updatedUser = await user.save();
    
    await Log.create({
      userId: user._id,
      userName: user.name,
      action: 'toggled availability',
      details: `Availability changed to ${user.profile.availability}`,
    });

    if (global.io) {
      global.io.emit('userUpdated', updatedUser.toObject());
    }

    res.json({ availability: updatedUser.profile.availability });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling availability', error: error.message });
  }
});

exports.getLogs = asyncHandler(async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).populate('userId', 'name');
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
});

exports.deleteLog = asyncHandler(async (req, res) => {
  try {
    const log = await Log.findByIdAndDelete(req.params.id);
    if (log) {
      await Log.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'deleted log',
        details: `Log ID ${req.params.id} deleted`,
      });
      global.io.emit('logDeleted', { _id: req.params.id });
      res.json({ message: 'Log deleted successfully' });
    } else {
      res.status(404).json({ message: 'Log not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting log', error: error.message });
  }
});

exports.deleteLogsBulk = asyncHandler(async (req, res) => {
  console.log('deleteLogsBulk called with req.body:', req.body);
  try {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({ message: 'No log IDs provided for deletion' });
    }

    const validObjectIds = logIds
      .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
      .filter(id => id !== null);

    if (validObjectIds.length === 0) {
      return res.status(400).json({ message: 'No valid log IDs provided' });
    }

    console.log('Valid ObjectIds for deletion:', validObjectIds.map(id => id.toString()));

    const result = await Log.deleteMany({ _id: { $in: validObjectIds } });
    if (result.deletedCount > 0) {
      if (req.user && req.user._id && req.user.name) {
        await Log.create({
          userId: req.user._id,
          userName: req.user.name,
          action: 'deleted logs bulk',
          details: `Deleted ${result.deletedCount} logs`,
        });
      } else {
        console.warn('req.user is missing or incomplete, skipping audit log');
      }
      validObjectIds.forEach(id => global.io.emit('logDeleted', { _id: id.toString() }));
      return res.json({ message: 'Logs deleted successfully', deletedCount: result.deletedCount });
    } else {
      return res.status(404).json({ message: 'No logs found to delete' });
    }
  } catch (error) {
    console.error('Bulk delete error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      requestBody: req.body,
    });
    return res.status(500).json({ message: 'Error deleting logs', error: error.message });
  }
});

exports.updateSettings = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('[Update Settings] Request Body:', req.body);
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();

    await Log.create({
      userId: user._id,
      userName: user.name,
      action: 'updated settings',
      details: `Updated name: ${name}, email: ${email}, password: ${password ? 'changed' : 'unchanged'}`,
    });
    global.io.emit('userUpdated', {
      ...user.toObject(),
      profile: { ...user.profile, image: user.profile.image ? user.profile.image : '' },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: 'Error updating settings', error: error.message });
  }
});

exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',') || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const query = {
      role: 'provider',
      'profile.status': 'active',
      'profile.location.fullAddress': { $regex: new RegExp(location, 'i') },
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile')
      .lean();

    if (!providers.length) {
      return res.status(200).json([]);
    }

    res.status(200).json(providers);

  } catch (error) {
    console.error('Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
});

exports.getMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({})
      .populate('customerId', 'name email')
      .populate('providerId', 'name')
      .sort({ createdAt: -1 }); 
  
    res.status(200).json(messages);
});

exports.markMessageAsRead = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);
  
    if (message) {
      message.status = 'read';
      const updatedMessage = await message.save();
      await updatedMessage.populate('customerId', 'name email');
      await updatedMessage.populate('providerId', 'name');
      res.json(updatedMessage);
    } else {
      res.status(404);
      throw new Error('Message not found');
    }
});
  
exports.deleteMessage = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);
  
    if (message) {
      await message.deleteOne();
      res.json({ message: 'Message removed' });
    } else {
      res.status(404);
      throw new Error('Message not found');
    }
});

exports.replyToMessage = asyncHandler(async (req, res) => {
    const { replyMessage } = req.body;
    const message = await Message.findById(req.params.id).populate('customerId', 'email name _id');
  
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }
    if (!replyMessage) {
      res.status(400);
      throw new Error('Reply message is required.');
    }
  
    message.status = 'replied';
    message.adminReply = {
      text: replyMessage,
      repliedAt: new Date()
    };
    const updatedMessage = await message.save();

    await updatedMessage.populate('customerId', 'name email');
    await updatedMessage.populate('providerId', 'name');

    if (global.io && message.customerId._id) {
        global.io.to(message.customerId._id.toString()).emit('newAdminReply', updatedMessage);
    }
  
    res.json({ message: `Reply sent to ${message.customerId.email} and saved.` });
});
  
exports.bulkMarkAsRead = asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    if (!messageIds || !Array.isArray(messageIds)) {
      res.status(400);
      throw new Error('An array of messageIds is required.');
    }
    await Message.updateMany({ _id: { $in: messageIds } }, { $set: { status: 'read' } });
    res.json({ message: 'Messages marked as read.' });
});
  
exports.bulkDelete = asyncHandler(async (req, res) => {
    const { messageIds } = req.body;
    if (!messageIds || !Array.isArray(messageIds)) {
      res.status(400);
      throw new Error('An array of messageIds is required.');
    }
    await Message.deleteMany({ _id: { $in: messageIds } });
    res.json({ message: 'Messages deleted.' });
});

// --- NEW FUNCTION TO UPDATE/DELETE SERVICE SLOTS ---
exports.updateServiceSlots = asyncHandler(async (req, res) => {
    const { serviceId, date, times } = req.body;

    if (!serviceId || !date || !Array.isArray(times)) {
        res.status(400);
        throw new Error('Service ID, date, and an array of times are required.');
    }

    const service = await Service.findById(serviceId);
    if (!service) {
        res.status(404);
        throw new Error('Service not found');
    }

    if (times.length > 0) {
        service.availableSlots.set(date, times);
    } else {
        // If an empty array is sent, delete the slots for that date
        service.availableSlots.delete(date);
    }

    const updatedService = await service.save();
    const populatedService = await Service.findById(updatedService._id).populate('createdBy', 'name');

    // Notify all clients that this service's availability has changed
    if (global.io) {
        global.io.emit('serviceUpdated', populatedService.toObject());
    }

    res.status(200).json(populatedService);
});