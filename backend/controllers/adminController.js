const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const Service = require('../models/Service'); // <-- ADDED: Service model is needed for slot management
const mongoose = require('mongoose');
const Log = require('../models/Log');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Ensure axios is imported


exports.getUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate({
        path: "profile.feedback",
        model: "Feedback",
        select: "rating comment createdAt",
        populate: {
          path: "bookingId",
          select: "service",
          populate: {
            path: "service",
            model: "Service",
            select: "name",
          },
        },
      })
      .populate({
        path: "profile.bookedServices",
        model: "Service",
        select: "name",
      })
      .lean();

    res.json(
      users.map((user) => ({
        ...user,
        profile: {
          ...user.profile,
          image: user.profile?.image || "/images/default-user.png",
          feedback: user.profile?.feedback || [],
          bookedServices: user.profile?.bookedServices || [],
        },
        image: user.profile?.image
          ? `/uploads${user.profile.image.startsWith("/") ? user.profile.image : "/" + user.profile.image}`
          : "/images/default-user.png",
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
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








// Mapping of nearby cities (consistent with bookingController.js)
const nearbyCities = {
  'Madhuravada': ['Visakhapatnam', 'PM Palem'],
  'Visakhapatnam': ['Madhuravada', 'PM Palem'],
  'PM Palem': ['Visakhapatnam', 'Madhuravada'],
  // Add more city mappings as needed
};

exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    // Extract city from location
    let customerCity = '';
    const locationParts = location.split(',').map(part => part.trim().toLowerCase());
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const addressComponents = response.data.results[0].address_components;
        customerCity = addressComponents.find(comp => comp.types.includes('locality'))?.long_name ||
                       addressComponents.find(comp => comp.types.includes('administrative_area_level_2'))?.long_name ||
                       '';
        console.log(`[getActiveProviders] Geocoded customer city: ${customerCity} from location: ${location}`);
      }
    } catch (error) {
      console.error(`[getActiveProviders] Geocoding error for location ${location}: ${error.message}`);
    }

    // Fallback: Parse city from location string
    if (!customerCity) {
      const cityMap = {
        'madhuravada': 'Madhuravada',
        'visakhapatnam': 'Visakhapatnam',
        'pm palem': 'PM Palem'
        // Add more as needed
      };
      for (const key of Object.keys(cityMap)) {
        if (locationParts.some(part => part.includes(key))) {
          customerCity = cityMap[key];
          break;
        }
      }
      if (!customerCity) {
        console.log(`[getActiveProviders] Could not extract city from location: ${location}`);
        return res.status(400).json({ message: 'Could not determine city from location' });
      }
    }

    // Get nearby cities
    const citiesToMatch = [customerCity, ...(nearbyCities[customerCity] || [])];
    console.log(`[getActiveProviders] Cities to match: ${citiesToMatch}`);

    // Build query
    const query = {
      role: 'provider',
      'profile.status': 'active',
      $or: [
        { 'profile.location.details.city': { $in: citiesToMatch } },
        { 'profile.location.fullAddress': { $regex: citiesToMatch.join('|'), $options: 'i' } }
      ]
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile')
      .lean();

    console.log(`[getActiveProviders] Location: ${location}, Services: ${services.join(',') || 'none'}, Providers found: ${providers.length}`);

    res.status(200).json(providers);
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
});

exports.assignProvider = asyncHandler(async (req, res) => {
  try {
    const { bookingId, providerId } = req.body;

    if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(providerId)) {
      return res.status(400).json({ message: 'Invalid booking or provider ID' });
    }

    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider' || provider.profile.status !== 'active') {
      return res.status(400).json({ message: 'Invalid or inactive provider' });
    }

    // Extract city from booking location
    let bookingCity = '';
    const locationParts = booking.location.split(',').map(part => part.trim().toLowerCase());
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const addressComponents = response.data.results[0].address_components;
        bookingCity = addressComponents.find(comp => comp.types.includes('locality'))?.long_name ||
                      addressComponents.find(comp => comp.types.includes('administrative_area_level_2'))?.long_name ||
                      '';
        console.log(`[assignProvider] Geocoded booking city: ${bookingCity} from location: ${booking.location}`);
      }
    } catch (error) {
      console.error(`[assignProvider] Geocoding error for booking location ${booking.location}: ${error.message}`);
    }

    // Fallback: Parse city from booking location
    if (!bookingCity) {
      const cityMap = {
        'madhuravada': 'Madhuravada',
        'visakhapatnam': 'Visakhapatnam',
        'pm palem': 'PM Palem'
        // Add more as needed
      };
      for (const key of Object.keys(cityMap)) {
        if (locationParts.some(part => part.includes(key))) {
          bookingCity = cityMap[key];
          break;
        }
      }
      if (!bookingCity) {
        console.log(`[assignProvider] Could not extract city from booking location: ${booking.location}`);
        return res.status(400).json({ message: 'Could not determine city from booking location' });
      }
    }

    // Get nearby cities for booking
    const bookingCities = [bookingCity, ...(nearbyCities[bookingCity] || [])];

    // Check provider location compatibility
    const providerCity = provider.profile.location.details.city || '';
    const providerFullAddress = provider.profile.location.fullAddress || '';
    const isLocationMatch = bookingCities.includes(providerCity) ||
                           bookingCities.some(city => providerFullAddress.toLowerCase().includes(city.toLowerCase()));

    if (!isLocationMatch) {
      console.log(`[assignProvider] Location mismatch: Booking city=${bookingCity}, Provider city=${providerCity}, Provider address=${providerFullAddress}`);
      return res.status(400).json({ message: 'Provider location does not match booking location' });
    }

    // Check skills compatibility
    const requiredSkills = booking.service.category ? [booking.service.category] : [];
    if (requiredSkills.length > 0 && !provider.profile.skills.some(skill => requiredSkills.includes(skill))) {
      console.log(`[assignProvider] Skills mismatch: Required=${requiredSkills}, Provider skills=${provider.profile.skills}`);
      return res.status(400).json({ message: 'Provider does not have required skills' });
    }

    // Check availability
    const bookingDate = new Date(booking.scheduledTime);
    const conflictingBookings = await Booking.find({
      provider: providerId,
      scheduledTime: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lte: new Date(bookingDate.setHours(23, 59, 59, 999)),
      },
      status: { $in: ['assigned', 'in-progress'] },
    });

    if (conflictingBookings.length > 0) {
      console.log(`[assignProvider] Provider ${providerId} has conflicting bookings`);
      return res.status(400).json({ message: 'Provider has conflicting bookings' });
    }

    // Assign provider
    booking.provider = providerId;
    booking.status = 'assigned';
    await booking.save();

    console.log(`[assignProvider] Provider ${providerId} assigned to booking ${bookingId}`);
    res.status(200).json({ message: 'Provider assigned successfully', booking });
  } catch (error) {
    console.error('[assignProvider] Error assigning provider:', error);
    res.status(500).json({ message: 'Server error while assigning provider' });
  }
});










































/* exports.getActiveProviders = asyncHandler(async (req, res) => {
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
}); */


















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