const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Plan = require('../models/Plan');
const mongoose = require('mongoose');
const Log = require('../models/Log');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// In-memory cache for Distance Matrix results (consider Redis for persistence)
const distanceCache = new Map();

async function getDistanceMatrix(origin, destination) {
  const cacheKey = `${origin}-${destination}`;
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey);
  }

  const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    params: {
      origins: origin,
      destinations: destination,
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  const distance = response.data.rows[0].elements[0].distance.value;
  distanceCache.set(cacheKey, distance);
  return distance;
}

// @desc    Get all users for admin dashboard
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find({}, { cache: false })
      .select('name email phone role profile subscriptionTier subscriptionStatus stripeCustomerId stripeSubscriptionId')
      .populate({
        path: 'profile.feedback',
        select: 'rating comment createdAt bookingId',
        populate: {
          path: 'bookingId',
          select: 'service',
          populate: { path: 'service', select: 'name' }
        }
      })
      .populate('profile.bookedServices', 'name');

    console.log(`[getUsers] Fetched ${users.length} users`);

    res.json(
      users.map((user) => {
        // Deduplicate bookedServices
        const uniqueBookedServices = user.profile?.bookedServices
          ? [...new Map(user.profile.bookedServices.map((service) => [service._id.toString(), service])).values()]
          : [];

        return {
          ...user.toObject(),
          phone: user.phone || '', // Ensure phone is included
          subscription: {
            subscriptionTier: user.subscriptionTier || 'free',
            subscriptionStatus: user.subscriptionStatus || 'active',
            stripeCustomerId: user.stripeCustomerId || null,
            stripePriceId: user.stripeSubscriptionId || null,
          },
          profile: {
            ...user.profile,
            image: user.profile?.image || '/images/default-user.png',
            feedback: user.profile?.feedback || [],
            bookedServices: uniqueBookedServices,
            location: user.profile?.location || {
              fullAddress: '',
              details: {
                streetNumber: '',
                street: '',
                city: '',
                state: '',
                country: '',
                postalCode: ''
              },
              coordinates: { lat: null, lng: null }
            },
            status: user.profile?.status || 'active',
          },
          image: user.profile?.image
            ? `/Uploads${user.profile.image.startsWith('/') ? user.profile.image : '/' + user.profile.image}`
            : '/images/default-user.png',
        };
      })
    );
  } catch (error) {
    console.error('[getUsers] Error fetching users:', error.message);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Remaining endpoints unchanged
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

/* exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[getActiveProviders] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.log(`[getActiveProviders] Using API key ending in ${process.env.GOOGLE_MAPS_API_KEY.slice(-4)}`);

    let coords;
    let bookingCity = '';
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        coords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        console.log(`[getActiveProviders] Geocoded location: ${location}, lat=${coords.lat}, lng=${coords.lng}, city=${bookingCity}`);
      } else {
        console.log(`[getActiveProviders] Geocoding failed for location: ${location}, status=${response.data.status}`);
        return res.status(400).json({ message: 'Could not geocode location' });
      }
    } catch (error) {
      console.error(`[getActiveProviders] Geocoding error for location ${location}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to geocode location' });
    }

    const query = {
      role: 'provider',
      'profile.status': 'active',
      'profile.location.coordinates': { $exists: true }
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile subscriptionTier')
      .lean();

    console.log(`[getActiveProviders] Location: ${location}, Services: ${services.join(',') || 'none'}, Providers found: ${providers.length}`);

    const maxDistance = 50 * 1000;
    const retry = async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === retries - 1) throw error;
          console.log(`[getActiveProviders] Retrying API call (${i + 1}/${retries}) for provider`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    const suitableProviders = await Promise.all(
      providers.map(async (provider) => {
        if (!provider.profile.location.coordinates ||
            isNaN(provider.profile.location.coordinates.lat) ||
            isNaN(provider.profile.location.coordinates.lng) ||
            provider.profile.location.coordinates.lat === 0 ||
            provider.profile.location.coordinates.lng === 0 ||
            Math.abs(provider.profile.location.coordinates.lat) > 90 ||
            Math.abs(provider.profile.location.coordinates.lng) > 180) {
          console.log(`[getActiveProviders] Provider ${provider._id} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }

        const cacheKey = `${coords.lat},${coords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;
        if (distanceCache.has(cacheKey)) {
          const distance = distanceCache.get(cacheKey);
          console.log(`[getActiveProviders] Using cached distance for provider ${provider._id}: ${distance}m`);
          if (distance > maxDistance) {
            console.log(`[getActiveProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
            return null;
          }
          return provider;
        }

        try {
          const response = await retry(() =>
            axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${coords.lat},${coords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            )
          );
          if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distance = response.data.rows[0].elements[0].distance.value;
            distanceCache.set(cacheKey, distance);
            if (distance > maxDistance) {
              console.log(`[getActiveProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return null;
            }
            console.log(`[getActiveProviders] Provider ${provider._id} included: Distance ${distance}m`);
            return provider;
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[getActiveProviders] Distance Matrix failed for provider ${provider._id}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[getActiveProviders] API key invalid or restricted for provider ${provider._id}`);
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[getActiveProviders] API quota exceeded for provider ${provider._id}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[getActiveProviders] Invalid or unroutable coordinates for provider ${provider._id}`);
            }
            if (bookingCity && provider.profile.location.details?.city &&
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
              return provider;
            }
            return null;
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[getActiveProviders] Distance Matrix error for provider ${provider._id}: ${errorDetails}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }
      })
    );

    const filteredProviders = suitableProviders.filter((p) => p !== null);
    console.log(`[getActiveProviders] Suitable providers: ${filteredProviders.length}`);
    res.status(200).json(filteredProviders);
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
}); */

/* 
exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[getActiveProviders] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // --- 2. Fetch all plan limits and define the date range ---
    const plans = await Plan.find({}).lean();
    const planLimits = {};
    plans.forEach(plan => {
      planLimits[plan.name.toLowerCase()] = plan.bookingLimit;
    });
    // Add a default for the free plan if it's not in the DB
    if (!planLimits.free) {
      planLimits.free = 5;
    }
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    // --- End of new logic ---

    let coords;
    let bookingCity = '';
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        coords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
      } else {
        return res.status(400).json({ message: 'Could not geocode location' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Failed to geocode location' });
    }

    const query = {
      role: 'provider',
      'profile.status': 'active',
      'profile.location.coordinates': { $exists: true }
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile subscriptionTier')
      .lean();

    const maxDistance = 50 * 1000;

    const suitableProviders = await Promise.all(
      providers.map(async (provider) => {
        let isWithinDistance = false;
        if (provider.profile.location.coordinates?.lat && provider.profile.location.coordinates?.lng) {
          try {
            const distance = await getDistanceMatrix(
              `${coords.lat},${coords.lng}`,
              `${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`
            );
            if (distance <= maxDistance) {
              isWithinDistance = true;
            }
          } catch (error) {
            console.error(`Distance Matrix failed for provider ${provider._id}, falling back to city check.`);
            if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              isWithinDistance = true;
            }
          }
        } else {
            if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              isWithinDistance = true;
            }
        }
        
        if (!isWithinDistance) {
            return null; // Exclude provider if not within distance and no city fallback
        }

        // --- 3. Check the provider's booking limit ---
        const tier = provider.subscriptionTier || 'free';
        const limit = planLimits[tier];

        let isEligible = true;
        let eligibilityReason = '';
        
        if (limit > 0) {
            const bookingCount = await Booking.countDocuments({
                provider: provider._id,
                status: { $in: ['assigned', 'in-progress', 'completed'] },
                createdAt: { $gte: startOfMonth, $lt: endOfMonth }
            });

            if (bookingCount >= limit) {
                isEligible = false;
                eligibilityReason = `Monthly limit of ${limit} bookings reached.`;
            }
        }
        
        // --- 4. Add eligibility info to the provider object ---
        return { ...provider, isEligible, eligibilityReason };
      })
    );

    const filteredProviders = suitableProviders.filter((p) => p !== null);
    res.status(200).json(filteredProviders);
    
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
});

exports.assignProvider = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.body;
    const { bookingId } = req.params;

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

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[assignProvider] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.log(`[assignProvider] Using API key ending in ${process.env.GOOGLE_MAPS_API_KEY.slice(-4)}`);

    let bookingCoords = booking.coordinates;
    let bookingCity = '';
    if (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng ||
        isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) ||
        bookingCoords.lat === 0 || bookingCoords.lng === 0 ||
        Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCoords = response.data.results[0].geometry.location;
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          booking.coordinates = bookingCoords;
          await booking.save();
          console.log(`[assignProvider] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
        } else {
          console.log(`[assignProvider] Geocoding failed for location: ${booking.location}, status=${response.data.status}`);
          return res.status(400).json({ message: 'Could not geocode booking location' });
        }
      } catch (error) {
        console.error(`[assignProvider] Geocoding error for location ${booking.location}: ${error.message}`);
        return res.status(500).json({ message: 'Failed to geocode booking location' });
      }
    } else if (!bookingCity) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          console.log(`[assignProvider] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
        }
      } catch (error) {
        console.error(`[assignProvider] Reverse geocoding error for booking ${bookingId}: ${error.message}`);
      }
    }

    if (!provider.profile.location.coordinates ||
        isNaN(provider.profile.location.coordinates.lat) ||
        isNaN(provider.profile.location.coordinates.lng) ||
        provider.profile.location.coordinates.lat === 0 ||
        provider.profile.location.coordinates.lng === 0 ||
        Math.abs(provider.profile.location.coordinates.lat) > 90 ||
        Math.abs(provider.profile.location.coordinates.lng) > 180) {
      console.log(`[assignProvider] Provider ${providerId} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
      if (bookingCity && provider.profile.location.details?.city &&
          bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
        console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
      } else {
        return res.status(400).json({ message: 'Provider location coordinates missing or invalid' });
      }
    } else {
      const maxDistance = 50 * 1000;
      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;

      if (distanceCache.has(cacheKey)) {
        const distance = distanceCache.get(cacheKey);
        console.log(`[assignProvider] Using cached distance for provider ${providerId}: ${distance}m`);
        if (distance > maxDistance) {
          console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
          return res.status(400).json({ message: 'Provider is too far from booking location' });
        }
      } else {
        const retry = async (fn, retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              return await fn();
            } catch (error) {
              if (i === retries - 1) throw error;
              console.log(`[assignProvider] Retrying API call (${i + 1}/${retries}) for provider ${providerId}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        try {
          const response = await retry(() =>
            axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${bookingCoords.lat},${bookingCoords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            )
          );
          if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distance = response.data.rows[0].elements[0].distance.value;
            distanceCache.set(cacheKey, distance);
            if (distance > maxDistance) {
              console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return res.status(400).json({ message: 'Provider is too far from booking location' });
            }
            console.log(`[assignProvider] Provider ${providerId} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[assignProvider] Distance Matrix failed for provider ${providerId}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[assignProvider] API key invalid or restricted for provider ${providerId}`);
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[assignProvider] Invalid or unroutable coordinates for provider ${providerId}`);
            }
            if (bookingCity && provider.profile.location.details?.city &&
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
            } else {
              return res.status(400).json({ message: `Could not calculate distance to provider: ${errorMessage}` });
            }
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[assignProvider] Distance Matrix error for provider ${providerId}: ${errorDetails}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
          } else {
            return res.status(500).json({ message: `Failed to calculate distance to provider: ${errorDetails}` });
          }
        }
      }
    }

    const requiredSkills = booking.service.category ? [booking.service.category] : [];
    if (requiredSkills.length > 0 && !provider.profile.skills.some(skill => requiredSkills.includes(skill))) {
      console.log(`[assignProvider] Skills mismatch: Required=${requiredSkills}, Provider skills=${provider.profile.skills}`);
      return res.status(400).json({ message: 'Provider does not have required skills' });
    }

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

    booking.provider = providerId;
    booking.status = 'assigned';
    await booking.save();

    console.log(`[assignProvider] Provider ${providerId} assigned to booking ${bookingId}`);

    if (global.io) {
      global.io.to(providerId.toString()).emit('newBookingAssigned', {
        bookingId: booking._id,
        message: `You have been assigned to booking #${booking._id.toString().slice(-6)} for ${booking.service.name}`,
        newStatus: 'assigned',
      });
      global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        message: `Your booking for ${booking.service.name} has been assigned to a provider`,
        newStatus: 'assigned',
      });
    } else {
      console.error('[assignProvider] Socket.IO not initialized');
    }

    res.status(200).json({ message: 'Provider assigned successfully', booking });
  } catch (error) {
    console.error('[assignProvider] Error assigning provider:', error);
    res.status(500).json({ message: 'Server error while assigning provider' });
  }
}); */

/* exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[getActiveProviders] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Fetch all plan limits and define the date range
    const plans = await Plan.find({}).lean();
    const planLimits = {};
    plans.forEach(plan => {
      planLimits[plan.name.toLowerCase()] = plan.bookingLimit;
    });
    planLimits.free = planLimits.free || 5; // Default for Free plan
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    let coords;
    let bookingCity = '';
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        coords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
      } else {
        return res.status(400).json({ message: 'Could not geocode location' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Failed to geocode location' });
    }

    const query = {
      role: 'provider',
      'profile.status': 'active',
      'profile.location.coordinates': { $exists: true }
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile subscriptionTier subscriptionStatus currentBookingCount subscriptionStartDate')
      .lean();

    const maxDistance = 50 * 1000;

    const suitableProviders = await Promise.all(
      providers.map(async (provider) => {
        let isWithinDistance = false;
        if (provider.profile.location.coordinates?.lat && provider.profile.location.coordinates?.lng) {
          try {
            const distance = await getDistanceMatrix(
              `${coords.lat},${coords.lng}`,
              `${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`
            );
            if (distance <= maxDistance) {
              isWithinDistance = true;
            }
          } catch (error) {
            console.error(`Distance Matrix failed for provider ${provider._id}, falling back to city check.`);
            if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              isWithinDistance = true;
            }
          }
        } else {
          if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            isWithinDistance = true;
          }
        }

        if (!isWithinDistance) {
          return null; // Exclude provider if not within distance and no city fallback
        }

        // Check booking limit
        const tier = provider.subscriptionTier || 'free';
        const limit = planLimits[tier];
        let isEligible = true;
        let eligibilityReason = '';

        if (limit > 0) {
          const bookingCount = provider.currentBookingCount || 0;
          if (bookingCount >= limit) {
            isEligible = false;
            eligibilityReason = `Monthly limit of ${limit} bookings reached.`;
          }
        }

        // Check subscription status and expiry
        let subscriptionStatusMessage = '';
        if (provider.subscriptionStatus === 'past_due') {
          isEligible = false;
          eligibilityReason = 'Subscription payment is past due.';
          subscriptionStatusMessage = 'Payment required to restore active status.';
        } else if (provider.subscriptionTier !== 'free' && provider.subscriptionStartDate) {
          const expiryDate = new Date(provider.subscriptionStartDate);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            subscriptionStatusMessage = `Subscription expires in ${daysUntilExpiry} day(s).`;
            if (global.io) {
              global.io.to(provider._id.toString()).emit('subscriptionWarning', {
                message: `Your ${provider.subscriptionTier} subscription expires in ${daysUntilExpiry} day(s). Please renew to continue receiving bookings.`
              });
            }
          }
        }

        return {
          ...provider,
          isEligible,
          eligibilityReason,
          bookingLimit: limit,
          subscriptionStatusMessage
        };
      })
    );

    const filteredProviders = suitableProviders.filter((p) => p !== null);
    res.status(200).json(filteredProviders);
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
}); */













exports.getActiveProviders = asyncHandler(async (req, res) => {
  try {
    const location = req.query.location;
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[getActiveProviders] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Fetch all plan limits and define the date range
    const plans = await Plan.find({}).lean();
    const planLimits = {};
    plans.forEach(plan => {
      planLimits[plan.name.toLowerCase()] = plan.bookingLimit;
    });
    planLimits.free = planLimits.free || 5; // Default for Free plan
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    let coords = null;
    let bookingCity = location; // Default to input location
    const isSimpleCity = !location.includes(','); // Check if location is a city name (no commas)

    // Only attempt geocoding for complex addresses
    if (!isSimpleCity) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        console.log('[getActiveProviders] Geocoding response:', {
          status: response.data.status,
          resultsCount: response.data.results.length,
          error_message: response.data.error_message || 'None'
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          coords = response.data.results[0].geometry.location;
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || location;
        } else if (response.data.status === 'ZERO_RESULTS') {
          console.warn('[getActiveProviders] No geocoding results for location:', location);
          // Fallback to using location as city
        } else {
          console.error('[getActiveProviders] Geocoding failed:', response.data.status, response.data.error_message);
          return res.status(400).json({ message: `Could not geocode location: ${response.data.status}` });
        }
      } catch (error) {
        console.error('[getActiveProviders] Geocoding error:', error.message);
        return res.status(500).json({ message: 'Failed to geocode location' });
      }
    } else {
      console.log('[getActiveProviders] Skipping geocoding, using location as city:', location);
    }

    const query = {
      role: 'provider',
      'profile.status': 'active'
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }
    // If geocoding failed or skipped, query by city
    if (!coords && bookingCity) {
      query['profile.location.details.city'] = { $regex: bookingCity, $options: 'i' }; // Case-insensitive city match
    } else if (coords) {
      query['profile.location.coordinates'] = { $exists: true }; // Only require coordinates if geocoding succeeded
    }

    console.log('[getActiveProviders] MongoDB query:', query);

    const providers = await User.find(query)
      .select('name email phone profile subscriptionTier subscriptionStatus currentBookingCount subscriptionStartDate')
      .lean();

    console.log('[getActiveProviders] Providers found:', providers.length);

    const maxDistance = 50 * 1000; // 50 km

    const suitableProviders = await Promise.all(
      providers.map(async (provider) => {
        let isWithinDistance = false;
        if (coords && provider.profile.location.coordinates?.lat && provider.profile.location.coordinates?.lng) {
          try {
            const distance = await getDistanceMatrix(
              `${coords.lat},${coords.lng}`,
              `${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`
            );
            if (distance <= maxDistance) {
              isWithinDistance = true;
            }
          } catch (error) {
            console.error(`[getActiveProviders] Distance Matrix failed for provider ${provider._id}:`, error.message);
            if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              isWithinDistance = true;
            }
          }
        } else if (bookingCity && provider.profile.location.details?.city && bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
          isWithinDistance = true;
        }

        if (!isWithinDistance) {
          return null; // Exclude provider if not within distance or city
        }

        // Check booking limit
        const tier = provider.subscriptionTier || 'free';
        const limit = planLimits[tier];
        let isEligible = true;
        let eligibilityReason = '';

        if (limit > 0) {
          const bookingCount = provider.currentBookingCount || 0;
          if (bookingCount >= limit) {
            isEligible = false;
            eligibilityReason = `Monthly limit of ${limit} bookings reached.`;
          }
        }

        // Check subscription status and expiry
        let subscriptionStatusMessage = '';
        if (provider.subscriptionStatus === 'past_due') {
          isEligible = false;
          eligibilityReason = 'Subscription payment is past due.';
          subscriptionStatusMessage = 'Payment required to restore active status.';
        } else if (provider.subscriptionTier !== 'free' && provider.subscriptionStartDate) {
          const expiryDate = new Date(provider.subscriptionStartDate);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            subscriptionStatusMessage = `Subscription expires in ${daysUntilExpiry} day(s).`;
            if (global.io) {
              global.io.to(provider._id.toString()).emit('subscriptionWarning', {
                message: `Your ${provider.subscriptionTier} subscription expires in ${daysUntilExpiry} day(s). Please renew to continue receiving bookings.`
              });
            }
          }
        }

        return {
          ...provider,
          isEligible,
          eligibilityReason,
          bookingLimit: limit,
          subscriptionStatusMessage
        };
      })
    );

    const filteredProviders = suitableProviders.filter((p) => p !== null);
    console.log('[getActiveProviders] Suitable providers:', filteredProviders.length);
    res.status(200).json(filteredProviders);
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
});



































exports.assignProvider = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.body;
    const { bookingId } = req.params;

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

    // Check subscription status
    if (provider.subscriptionStatus === 'past_due') {
      return res.status(400).json({ message: 'Provider’s subscription is past due and cannot accept bookings.' });
    }

    // Check booking limit
    const plans = await Plan.find({}).lean();
    const planLimits = {};
    plans.forEach(plan => {
      planLimits[plan.name.toLowerCase()] = plan.bookingLimit;
    });
    planLimits.free = planLimits.free || 5;
    const tier = provider.subscriptionTier || 'free';
    const limit = planLimits[tier];

    if (limit > 0 && provider.currentBookingCount >= limit) {
      return res.status(400).json({ message: `Provider has reached their monthly booking limit of ${limit}.` });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[assignProvider] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.log(`[assignProvider] Using API key ending in ${process.env.GOOGLE_MAPS_API_KEY.slice(-4)}`);

    let bookingCoords = booking.coordinates;
    let bookingCity = '';
    if (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng ||
        isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) ||
        bookingCoords.lat === 0 || bookingCoords.lng === 0 ||
        Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCoords = response.data.results[0].geometry.location;
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          booking.coordinates = bookingCoords;
          await booking.save();
          console.log(`[assignProvider] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
        } else {
          console.log(`[assignProvider] Geocoding failed for location: ${booking.location}, status=${response.data.status}`);
          return res.status(400).json({ message: 'Could not geocode booking location' });
        }
      } catch (error) {
        console.error(`[assignProvider] Geocoding error for location ${booking.location}: ${error.message}`);
        return res.status(500).json({ message: 'Failed to geocode booking location' });
      }
    } else if (!bookingCity) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          console.log(`[assignProvider] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
        }
      } catch (error) {
        console.error(`[assignProvider] Reverse geocoding error for booking ${bookingId}: ${error.message}`);
      }
    }

    if (!provider.profile.location.coordinates ||
        isNaN(provider.profile.location.coordinates.lat) ||
        isNaN(provider.profile.location.coordinates.lng) ||
        provider.profile.location.coordinates.lat === 0 ||
        provider.profile.location.coordinates.lng === 0 ||
        Math.abs(provider.profile.location.coordinates.lat) > 90 ||
        Math.abs(provider.profile.location.coordinates.lng) > 180) {
      console.log(`[assignProvider] Provider ${providerId} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
      if (bookingCity && provider.profile.location.details?.city &&
          bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
        console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
      } else {
        return res.status(400).json({ message: 'Provider location coordinates missing or invalid' });
      }
    } else {
      const maxDistance = 50 * 1000;
      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;

      if (distanceCache.has(cacheKey)) {
        const distance = distanceCache.get(cacheKey);
        console.log(`[assignProvider] Using cached distance for provider ${providerId}: ${distance}m`);
        if (distance > maxDistance) {
          console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
          return res.status(400).json({ message: 'Provider is too far from booking location' });
        }
      } else {
        const retry = async (fn, retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              return await fn();
            } catch (error) {
              if (i === retries - 1) throw error;
              console.log(`[assignProvider] Retrying API call (${i + 1}/${retries}) for provider ${providerId}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        try {
          const response = await retry(() =>
            axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${bookingCoords.lat},${bookingCoords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            )
          );
          if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distance = response.data.rows[0].elements[0].distance.value;
            distanceCache.set(cacheKey, distance);
            if (distance > maxDistance) {
              console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return res.status(400).json({ message: 'Provider is too far from booking location' });
            }
            console.log(`[assignProvider] Provider ${providerId} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[assignProvider] Distance Matrix failed for provider ${providerId}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[assignProvider] API key invalid or restricted for provider ${providerId}`);
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[assignProvider] Invalid or unroutable coordinates for provider ${providerId}`);
            }
            if (bookingCity && provider.profile.location.details?.city &&
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
            } else {
              return res.status(400).json({ message: `Could not calculate distance to provider: ${errorMessage}` });
            }
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[assignProvider] Distance Matrix error for provider ${providerId}: ${errorDetails}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
          } else {
            return res.status(500).json({ message: `Failed to calculate distance to provider: ${errorDetails}` });
          }
        }
      }
    }

    const requiredSkills = booking.service.category ? [booking.service.category] : [];
    if (requiredSkills.length > 0 && !provider.profile.skills.some(skill => requiredSkills.includes(skill))) {
      console.log(`[assignProvider] Skills mismatch: Required=${requiredSkills}, Provider skills=${provider.profile.skills}`);
      return res.status(400).json({ message: 'Provider does not have required skills' });
    }

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

    // Update booking and provider
    booking.provider = providerId;
    booking.status = 'assigned';
    provider.currentBookingCount = (provider.currentBookingCount || 0) + 1;
    await Promise.all([booking.save(), provider.save()]);

    console.log(`[assignProvider] Provider ${providerId} assigned to booking ${bookingId}, updated booking count: ${provider.currentBookingCount}`);

    if (global.io) {
      global.io.to(providerId.toString()).emit('newBookingAssigned', {
        bookingId: booking._id,
        message: `You have been assigned to booking #${booking._id.toString().slice(-6)} for ${booking.service.name}`,
        newStatus: 'assigned',
      });
      global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        message: `Your booking for ${booking.service.name} has been assigned to a provider`,
        newStatus: 'assigned',
      });
      global.io.to('admin_room').emit('bookingUpdated', {
        bookingId: booking._id,
        message: `Booking #${booking._id.toString().slice(-6)} assigned to provider ${provider.name}`,
      });
    } else {
      console.error('[assignProvider] Socket.IO not initialized');
    }

    res.status(200).json({ message: 'Provider assigned successfully', booking });
  } catch (error) {
    console.error('[assignProvider] Error assigning provider:', error);
    res.status(500).json({ message: 'Server error while assigning provider' });
  }
});

// New endpoint for admin to manage provider subscriptions
exports.getProviderSubscriptions = asyncHandler(async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' })
      .select('name email subscriptionTier subscriptionStatus subscriptionStartDate currentBookingCount stripeSubscriptionId')
      .lean();

    const plans = await Plan.find({}).lean();
    const planLimits = {};
    plans.forEach(plan => {
      planLimits[plan.name.toLowerCase()] = plan.bookingLimit;
    });
    planLimits.free = planLimits.free || 5;

    const providerSubscriptions = await Promise.all(
      providers.map(async (provider) => {
        const tier = provider.subscriptionTier || 'free';
        const limit = planLimits[tier];
        let subscriptionStatusMessage = '';

        if (provider.subscriptionStatus === 'past_due') {
          subscriptionStatusMessage = 'Payment required to restore active status.';
        } else if (provider.subscriptionTier !== 'free' && provider.subscriptionStartDate) {
          const expiryDate = new Date(provider.subscriptionStartDate);
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            subscriptionStatusMessage = `Subscription expires in ${daysUntilExpiry} day(s).`;
            if (global.io) {
              global.io.to(provider._id.toString()).emit('subscriptionWarning', {
                message: `Your ${provider.subscriptionTier} subscription expires in ${daysUntilExpiry} day(s). Please renew to continue receiving bookings.`
              });
            }
          }
        }

        return {
          ...provider,
          bookingLimit: limit,
          subscriptionStatusMessage,
          isEligible: provider.subscriptionStatus !== 'past_due' && (limit === 0 || provider.currentBookingCount < limit)
        };
      })
    );

    res.status(200).json(providerSubscriptions);
  } catch (error) {
    console.error('[getProviderSubscriptions] Error fetching provider subscriptions:', error);
    res.status(500).json({ message: 'Server error while fetching provider subscriptions' });
  }
});

// New endpoint to cancel a provider's subscription (admin action)
exports.cancelProviderSubscription = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.params;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    if (!mongoose.isValidObjectId(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (provider.subscriptionTier === 'free') {
      return res.status(400).json({ message: 'Provider has no active subscription to cancel' });
    }

    if (provider.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(provider.stripeSubscriptionId);
        if (subscription.status !== 'canceled') {
          await stripe.subscriptions.cancel(provider.stripeSubscriptionId);
          console.log(`[cancelProviderSubscription] Stripe subscription ${provider.stripeSubscriptionId} canceled for provider ${providerId}`);
        }
      } catch (stripeError) {
        console.error(`[cancelProviderSubscription] Stripe error: ${stripeError.message}`);
        if (stripeError.code !== 'resource_missing') {
          throw new Error(`Stripe cancellation failed: ${stripeError.message}`);
        }
      }
    }

    provider.subscriptionTier = 'free';
    provider.subscriptionStatus = 'canceled';
    provider.stripeSubscriptionId = null;
    provider.currentBookingCount = 0;
    provider.subscriptionStartDate = null;
    await provider.save();

    if (global.io) {
      global.io.to(providerId.toString()).emit('subscriptionUpdated', {
        subscriptionTier: provider.subscriptionTier,
        subscriptionStatus: provider.subscriptionStatus,
        message: 'Your subscription has been canceled by an admin. You have been downgraded to the free plan.'
      });
    }

    res.status(200).json({
      message: 'Provider subscription canceled successfully',
      provider: {
        _id: provider._id,
        name: provider.name,
        subscriptionTier: provider.subscriptionTier,
        subscriptionStatus: provider.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('[cancelProviderSubscription] Error:', error.message);
    res.status(500).json({ message: `Failed to cancel provider subscription: ${error.message}` });
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

























































































































//min
/* const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const Service = require('../models/Service'); // <-- ADDED: Service model is needed for slot management
const mongoose = require('mongoose');
const Log = require('../models/Log');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Ensure axios is imported
// In-memory cache for Distance Matrix results (consider Redis for persistence)
const distanceCache = new Map();

async function getDistanceMatrix(origin, destination) {
  const cacheKey = `${origin}-${destination}`;
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey);
  }

  const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    params: {
      origins: origin,
      destinations: destination,
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  const distance = response.data.rows[0].elements[0].distance.value;
  distanceCache.set(cacheKey, distance);
  return distance;
}

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
    const services = req.query.services?.split(',').map(s => s.trim()) || [];

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[getActiveProviders] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.log(`[getActiveProviders] Using API key ending in ${process.env.GOOGLE_MAPS_API_KEY.slice(-4)}`);

    let coords;
    let bookingCity = '';
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        coords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        console.log(`[getActiveProviders] Geocoded location: ${location}, lat=${coords.lat}, lng=${coords.lng}, city=${bookingCity}`);
      } else {
        console.log(`[getActiveProviders] Geocoding failed for location: ${location}, status=${response.data.status}`);
        return res.status(400).json({ message: 'Could not geocode location' });
      }
    } catch (error) {
      console.error(`[getActiveProviders] Geocoding error for location ${location}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to geocode location' });
    }

    const query = {
      role: 'provider',
      'profile.status': 'active',
      'profile.location.coordinates': { $exists: true }
    };
    if (services.length > 0) {
      query['profile.skills'] = { $in: services };
    }

    const providers = await User.find(query)
      .select('name email phone profile')
      .lean();

    console.log(`[getActiveProviders] Location: ${location}, Services: ${services.join(',') || 'none'}, Providers found: ${providers.length}`);

    const maxDistance = 50 * 1000;
    const retry = async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === retries - 1) throw error;
          console.log(`[getActiveProviders] Retrying API call (${i + 1}/${retries}) for provider`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    const suitableProviders = await Promise.all(
      providers.map(async (provider) => {
        if (!provider.profile.location.coordinates ||
            isNaN(provider.profile.location.coordinates.lat) ||
            isNaN(provider.profile.location.coordinates.lng) ||
            provider.profile.location.coordinates.lat === 0 ||
            provider.profile.location.coordinates.lng === 0 ||
            Math.abs(provider.profile.location.coordinates.lat) > 90 ||
            Math.abs(provider.profile.location.coordinates.lng) > 180) {
          console.log(`[getActiveProviders] Provider ${provider._id} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }

        const cacheKey = `${coords.lat},${coords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;
        if (distanceCache.has(cacheKey)) {
          const distance = distanceCache.get(cacheKey);
          console.log(`[getActiveProviders] Using cached distance for provider ${provider._id}: ${distance}m`);
          if (distance > maxDistance) {
            console.log(`[getActiveProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
            return null;
          }
          return provider;
        }

        try {
          const response = await retry(() =>
            axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${coords.lat},${coords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            )
          );
          if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distance = response.data.rows[0].elements[0].distance.value;
            distanceCache.set(cacheKey, distance);
            if (distance > maxDistance) {
              console.log(`[getActiveProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return null;
            }
            console.log(`[getActiveProviders] Provider ${provider._id} included: Distance ${distance}m`);
            return provider;
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[getActiveProviders] Distance Matrix failed for provider ${provider._id}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[getActiveProviders] API key invalid or restricted for provider ${provider._id}`);
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[getActiveProviders] API quota exceeded for provider ${provider._id}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[getActiveProviders] Invalid or unroutable coordinates for provider ${provider._id}`);
            }
            if (bookingCity && provider.profile.location.details?.city &&
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
              return provider;
            }
            return null;
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[getActiveProviders] Distance Matrix error for provider ${provider._id}: ${errorDetails}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[getActiveProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }
      })
    );

    const filteredProviders = suitableProviders.filter((p) => p !== null);
    console.log(`[getActiveProviders] Suitable providers: ${filteredProviders.length}`);
    res.status(200).json(filteredProviders);
  } catch (error) {
    console.error('[getActiveProviders] Error fetching active providers:', error);
    res.status(500).json({ message: 'Server error while fetching providers' });
  }
});

exports.assignProvider = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.body;
    const { bookingId } = req.params;

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

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[assignProvider] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    console.log(`[assignProvider] Using API key ending in ${process.env.GOOGLE_MAPS_API_KEY.slice(-4)}`);

    let bookingCoords = booking.coordinates;
    let bookingCity = '';
    if (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng ||
        isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) ||
        bookingCoords.lat === 0 || bookingCoords.lng === 0 ||
        Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCoords = response.data.results[0].geometry.location;
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          booking.coordinates = bookingCoords;
          await booking.save();
          console.log(`[assignProvider] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
        } else {
          console.log(`[assignProvider] Geocoding failed for location: ${booking.location}, status=${response.data.status}`);
          return res.status(400).json({ message: 'Could not geocode booking location' });
        }
      } catch (error) {
        console.error(`[assignProvider] Geocoding error for location ${booking.location}: ${error.message}`);
        return res.status(500).json({ message: 'Failed to geocode booking location' });
      }
    } else if (!bookingCity) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          console.log(`[assignProvider] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
        }
      } catch (error) {
        console.error(`[assignProvider] Reverse geocoding error for booking ${bookingId}: ${error.message}`);
      }
    }

    if (!provider.profile.location.coordinates ||
        isNaN(provider.profile.location.coordinates.lat) ||
        isNaN(provider.profile.location.coordinates.lng) ||
        provider.profile.location.coordinates.lat === 0 ||
        provider.profile.location.coordinates.lng === 0 ||
        Math.abs(provider.profile.location.coordinates.lat) > 90 ||
        Math.abs(provider.profile.location.coordinates.lng) > 180) {
      console.log(`[assignProvider] Provider ${providerId} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
      if (bookingCity && provider.profile.location.details?.city &&
          bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
        console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
      } else {
        return res.status(400).json({ message: 'Provider location coordinates missing or invalid' });
      }
    } else {
      const maxDistance = 50 * 1000;
      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;

      if (distanceCache.has(cacheKey)) {
        const distance = distanceCache.get(cacheKey);
        console.log(`[assignProvider] Using cached distance for provider ${providerId}: ${distance}m`);
        if (distance > maxDistance) {
          console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
          return res.status(400).json({ message: 'Provider is too far from booking location' });
        }
      } else {
        const retry = async (fn, retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              return await fn();
            } catch (error) {
              if (i === retries - 1) throw error;
              console.log(`[assignProvider] Retrying API call (${i + 1}/${retries}) for provider ${providerId}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        try {
          const response = await retry(() =>
            axios.get(
              `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${bookingCoords.lat},${bookingCoords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            )
          );
          if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distance = response.data.rows[0].elements[0].distance.value;
            distanceCache.set(cacheKey, distance);
            if (distance > maxDistance) {
              console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return res.status(400).json({ message: 'Provider is too far from booking location' });
            }
            console.log(`[assignProvider] Provider ${providerId} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[assignProvider] Distance Matrix failed for provider ${providerId}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[assignProvider] API key invalid or restricted for provider ${providerId}`);
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[assignProvider] Invalid or unroutable coordinates for provider ${providerId}`);
            }
            if (bookingCity && provider.profile.location.details?.city &&
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
            } else {
              return res.status(400).json({ message: `Could not calculate distance to provider: ${errorMessage}` });
            }
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[assignProvider] Distance Matrix error for provider ${providerId}: ${errorDetails}`);
          if (bookingCity && provider.profile.location.details?.city &&
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
          } else {
            return res.status(500).json({ message: `Failed to calculate distance to provider: ${errorDetails}` });
          }
        }
      }
    }

    const requiredSkills = booking.service.category ? [booking.service.category] : [];
    if (requiredSkills.length > 0 && !provider.profile.skills.some(skill => requiredSkills.includes(skill))) {
      console.log(`[assignProvider] Skills mismatch: Required=${requiredSkills}, Provider skills=${provider.profile.skills}`);
      return res.status(400).json({ message: 'Provider does not have required skills' });
    }

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

    booking.provider = providerId;
    booking.status = 'assigned';
    await booking.save();

    console.log(`[assignProvider] Provider ${providerId} assigned to booking ${bookingId}`);

    if (global.io) {
      global.io.to(providerId.toString()).emit('newBookingAssigned', {
        bookingId: booking._id,
        message: `You have been assigned to booking #${booking._id.toString().slice(-6)} for ${booking.service.name}`,
        newStatus: 'assigned',
      });
      global.io.to(booking.customer.toString()).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        message: `Your booking for ${booking.service.name} has been assigned to a provider`,
        newStatus: 'assigned',
      });
    } else {
      console.error('[assignProvider] Socket.IO not initialized');
    }

    res.status(200).json({ message: 'Provider assigned successfully', booking });
  } catch (error) {
    console.error('[assignProvider] Error assigning provider:', error);
    res.status(500).json({ message: 'Server error while assigning provider' });
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
}); */