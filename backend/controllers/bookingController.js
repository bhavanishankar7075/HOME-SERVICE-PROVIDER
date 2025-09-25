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
});

const calculateRevenue = async () => {
  const result = await Booking.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result[0]?.total || 0;
};

/* const createBooking = asyncHandler(async (req, res) => {
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

  if (!customer.name || !customer.email || !customer.phone || !customer.profile) {
    res.status(400);
    throw new Error('Please complete your profile (name, email, phone, and profile details) before booking');
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
      profileImage: customer.profile?.image || '/images/default-user.png',
    },
    paymentDetails: {
      method: paymentMethod,
      status: 'pending',
    },
    status: 'pending',
  });

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

  console.log('Booking Created:', {
    bookingId: booking._id,
    customerId: booking.customer,
    customerName: customer.name,
    profileExists: !!customer.profile,
    profileImage: customer.profile?.image || '/images/default-user.png',
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
}); */






const createBooking = asyncHandler(async (req, res) => {
  // --- Joi Validation ---
  const { error } = bookingValidationSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  // MODIFICATION 1: Destructure 'timeSlot' from the request body.
  const { serviceId, scheduledTime, location, paymentMethod, isImmediate, timeSlot } = req.body;

  // --- Find Service ---
  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

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
    // MODIFICATION 2: Use 'timeSlot' for robust, server-independent validation.
    // This logic no longer depends on the server's local timezone.
    const bookingDate = new Date(scheduledTime);
    const dateStr = bookingDate.toISOString().split('T')[0]; // e.g., "2025-09-26"
    const availableTimes = service.availableSlots.get(dateStr) || [];

    // Check if the provided timeSlot is valid and exists in the available slots.
    if (!timeSlot || !availableTimes.includes(timeSlot)) {
        res.status(400);
        throw new Error(`The selected time slot ${timeSlot || ''} is no longer available for ${dateStr}. Please select another time.`);
    }

    // Remove the booked slot from the service's availability.
    service.availableSlots.set(dateStr, availableTimes.filter(time => time !== timeSlot));
    if (service.availableSlots.get(dateStr).length === 0) {
      service.availableSlots.delete(dateStr);
    }
    await service.save();
  }

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

  // --- Send Response ---
  res.status(201).json(booking);
});








//main and main

/* const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service customer');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.customer) {
    console.log(`[findAvailableProviders] Invalid booking customer: bookingId=${bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
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

  // Verify API key
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error('[findAvailableProviders] GOOGLE_MAPS_API_KEY is not set');
    res.status(500);
    throw new Error('Server configuration error');
  }

  // Geocode booking location
  let bookingCoords = booking.coordinates;
  let bookingCity = '';
  if (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng || 
      isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) || 
      bookingCoords.lat === 0 || bookingCoords.lng === 0 || 
      Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCoords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        booking.coordinates = bookingCoords;
        await booking.save();
        console.log(`[findAvailableProviders] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
      } else {
        console.log(`[findAvailableProviders] Geocoding failed for location: ${location}, status=${response.data.status}`);
        res.status(400);
        throw new Error('Could not geocode booking location');
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Geocoding error for location ${location}: ${error.message}`);
      res.status(500);
      throw new Error('Failed to geocode booking location');
    }
  } else if (!bookingCity) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        console.log(`[findAvailableProviders] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Reverse geocoding error for booking ${bookingId}: ${error.message}`);
    }
  }

  // Query active providers with matching skills
  const providers = await User.find({
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills },
    'profile.location.coordinates': { $exists: true }
  })
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Providers found: ${providers.length}`);

  // Filter providers by distance and availability
  const maxDistance = 50 * 1000; // 50 km in meters
  const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`[findAvailableProviders] Retrying API call (${i + 1}/${retries}) for provider`);
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
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
        if (bookingCity && provider.profile.location.details?.city && 
            bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
          console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
          return provider;
        }
        return null;
      }

      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;
      if (distanceCache.has(cacheKey)) {
        const distance = distanceCache.get(cacheKey);
        console.log(`[findAvailableProviders] Using cached distance for provider ${provider._id}: ${distance}m`);
        if (distance > maxDistance) {
          console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
          return null;
        }
      } else {
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
              console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return null;
            }
            console.log(`[findAvailableProviders] Provider ${provider._id} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[findAvailableProviders] Distance Matrix failed for provider ${provider._id}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (bookingCity && provider.profile.location.details?.city && 
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
              return provider;
            }
            return null;
          }
        } catch (error) {
          console.error(`[findAvailableProviders] Distance Matrix error for provider ${provider._id}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
          if (bookingCity && provider.profile.location.details?.city && 
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }
      }

      // Check availability
      const bookingDate = new Date(scheduledTime);
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

      const availabilityString = provider.profile?.availability;
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
}); */

/* const assignProvider = asyncHandler(async (req, res) => {
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

    // Verify API key
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[assignProvider] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Geocode booking location if no coordinates
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
      // Fetch city for fallback
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

    // Check provider proximity
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
      const maxDistance = 50 * 1000; // 50 km in meters
      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;

      // Check cache for distance
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
            distanceCache.set(cacheKey, distance); // Cache the result
            if (distance > maxDistance) {
              console.log(`[assignProvider] Provider ${providerId} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return res.status(400).json({ message: 'Provider is too far from booking location' });
            }
            console.log(`[assignProvider] Provider ${providerId} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[assignProvider] Distance Matrix failed for provider ${providerId}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[assignProvider] API key invalid or restricted for provider ${providerId}`);
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
}); */
 


/* const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service customer');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.customer) {
    console.log(`[findAvailableProviders] Invalid booking customer: bookingId=${bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
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

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error('[findAvailableProviders] GOOGLE_MAPS_API_KEY is not set');
    res.status(500);
    throw new Error('Server configuration error');
  }

  let bookingCoords = booking.coordinates;
  let bookingCity = '';
  if (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng || 
      isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) || 
      bookingCoords.lat === 0 || bookingCoords.lng === 0 || 
      Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCoords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        booking.coordinates = bookingCoords;
        await booking.save();
        console.log(`[findAvailableProviders] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
      } else {
        console.log(`[findAvailableProviders] Geocoding failed for location: ${location}, status=${response.data.status}`);
        res.status(400);
        throw new Error('Could not geocode booking location');
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Geocoding error for location ${location}: ${error.message}`);
      res.status(500);
      throw new Error('Failed to geocode booking location');
    }
  } else if (!bookingCity) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        console.log(`[findAvailableProviders] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Reverse geocoding error for booking ${bookingId}: ${error.message}`);
    }
  }

  const providers = await User.find({
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills },
    'profile.location.coordinates': { $exists: true }
  })
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Providers found: ${providers.length}`);

  const maxDistance = 50 * 1000;
  const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`[findAvailableProviders] Retrying API call (${i + 1}/${retries}) for provider`);
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
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location.coordinates)}`);
        if (bookingCity && provider.profile.location.details?.city && 
            bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
          console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
          return provider;
        }
        return null;
      }

      const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;
      if (distanceCache.has(cacheKey)) {
        const distance = distanceCache.get(cacheKey);
        console.log(`[findAvailableProviders] Using cached distance for provider ${provider._id}: ${distance}m`);
        if (distance > maxDistance) {
          console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
          return null;
        }
      } else {
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
              console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
              return null;
            }
            console.log(`[findAvailableProviders] Provider ${provider._id} included: Distance ${distance}m`);
          } else {
            const errorMessage = response.data.error_message || 'Unknown error';
            const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
            console.log(`[findAvailableProviders] Distance Matrix failed for provider ${provider._id}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
            if (bookingCity && provider.profile.location.details?.city && 
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
              return provider;
            }
            return null;
          }
        } catch (error) {
          console.error(`[findAvailableProviders] Distance Matrix error for provider ${provider._id}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
          if (bookingCity && provider.profile.location.details?.city && 
              bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
            console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
            return provider;
          }
          return null;
        }
      }

      const bookingDate = new Date(scheduledTime);
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

      const availabilityString = provider.profile?.availability;
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
}); */

/* const assignProvider = asyncHandler(async (req, res) => {
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
            if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (response.data.status === 'REQUEST_DENIED') {
              console.log(`[assignProvider] API key invalid or restricted for provider ${providerId}`);
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


const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    console.error('[findAvailableProviders] Invalid booking ID:', bookingId);
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service customer');
  if (!booking) {
    console.error('[findAvailableProviders] Booking not found:', bookingId);
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.customer) {
    console.error(`[findAvailableProviders] Invalid booking customer: bookingId=${bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
  }

  const { service, scheduledTime, location } = booking;
  if (!scheduledTime || !location) {
    console.error('[findAvailableProviders] Booking missing scheduled time or location:', { bookingId, scheduledTime, location });
    res.status(400);
    throw new Error('Booking missing scheduled time or location');
  }

  const skills = service.category ? [service.category] : [];
  if (skills.length === 0) {
    console.error('[findAvailableProviders] Service missing category:', { bookingId, service });
    res.status(400);
    throw new Error('Service missing category');
  }

  let bookingCoords = booking.coordinates;
  let bookingCity = location.trim();
  const isSimpleCity = !location.includes(',');

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error('[findAvailableProviders] GOOGLE_MAPS_API_KEY is not set');
    res.status(500);
    throw new Error('Server configuration error: Google Maps API key missing');
  }

  if (!isSimpleCity && (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng || 
      isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) || 
      bookingCoords.lat === 0 || bookingCoords.lng === 0 || 
      Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180)) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      console.log('[findAvailableProviders] Geocoding response:', {
        status: response.data.status,
        resultsCount: response.data.results.length,
        error_message: response.data.error_message || 'None'
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCoords = response.data.results[0].geometry.location;
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || location;
        booking.coordinates = bookingCoords;
        await booking.save();
        console.log(`[findAvailableProviders] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
      } else if (response.data.status === 'REQUEST_DENIED') {
        console.error('[findAvailableProviders] Geocoding failed: REQUEST_DENIED, check API key configuration');
        res.status(500);
        throw new Error('Geocoding failed: Invalid or disabled Google Maps API key');
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.warn('[findAvailableProviders] No geocoding results for location:', location);
        // Fallback to city
      } else {
        console.error('[findAvailableProviders] Geocoding failed:', response.data.status, response.data.error_message);
        res.status(400);
        throw new Error(`Could not geocode booking location: ${response.data.status}`);
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Geocoding error for location ${location}:`, error.message);
      res.status(500);
      throw new Error('Failed to geocode booking location: Server error');
    }
  } else if (!bookingCity && bookingCoords?.lat && bookingCoords?.lng) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      console.log('[findAvailableProviders] Reverse geocoding response:', {
        status: response.data.status,
        resultsCount: response.data.results.length,
        error_message: response.data.error_message || 'None'
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
        console.log(`[findAvailableProviders] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
      } else if (response.data.status === 'REQUEST_DENIED') {
        console.error('[findAvailableProviders] Reverse geocoding failed: REQUEST_DENIED, check API key configuration');
        res.status(500);
        throw new Error('Reverse geocoding failed: Invalid or disabled Google Maps API key');
      }
    } catch (error) {
      console.error(`[findAvailableProviders] Reverse geocoding error for booking ${bookingId}:`, error.message);
    }
  } else {
    console.log('[findAvailableProviders] Skipping geocoding, using location as city:', bookingCity);
  }

  const query = {
    role: 'provider',
    'profile.status': 'active',
    'profile.skills': { $in: skills }
  };
  if (!bookingCoords && bookingCity) {
    query['profile.location.details.city'] = { $regex: `^${bookingCity}$`, $options: 'i' };
  } else if (bookingCoords) {
    query['profile.location.coordinates'] = { $exists: true };
  }

  const providers = await User.find(query)
    .select('name email phone profile')
    .lean();

  console.log(`[findAvailableProviders] Booking ID: ${bookingId}, Skills: ${skills}, Providers found: ${providers.length}`);

  const maxDistance = 50 * 1000;
  const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`[findAvailableProviders] Retrying API call (${i + 1}/${retries}) for provider`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const suitableProviders = await Promise.all(
    providers.map(async (provider) => {
      if (!provider.profile.location?.coordinates || 
          isNaN(provider.profile.location.coordinates.lat) || 
          isNaN(provider.profile.location.coordinates.lng) || 
          provider.profile.location.coordinates.lat === 0 || 
          provider.profile.location.coordinates.lng === 0 || 
          Math.abs(provider.profile.location.coordinates.lat) > 90 || 
          Math.abs(provider.profile.location.coordinates.lng) > 180) {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location?.coordinates)}`);
        if (bookingCity && provider.profile.location?.details?.city && 
            bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
          console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
          return provider;
        }
        return null;
      }

      if (bookingCoords && bookingCoords.lat && bookingCoords.lng) {
        const cacheKey = `${bookingCoords.lat},${bookingCoords.lng}:${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}`;
        if (distanceCache.has(cacheKey)) {
          const distance = distanceCache.get(cacheKey);
          console.log(`[findAvailableProviders] Using cached distance for provider ${provider._id}: ${distance}m`);
          if (distance > maxDistance) {
            console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
            return null;
          }
        } else {
          try {
            const response = await retry(() =>
              axios.get(
                `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${bookingCoords.lat},${bookingCoords.lng}&destinations=${provider.profile.location.coordinates.lat},${provider.profile.location.coordinates.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
              )
            );
            console.log('[findAvailableProviders] Distance Matrix response:', {
              status: response.data.status,
              elementStatus: response.data.rows?.[0]?.elements?.[0]?.status || 'N/A',
              error_message: response.data.error_message || 'None'
            });

            if (response.data.status === 'OK' && response.data.rows?.[0]?.elements?.[0]?.status === 'OK') {
              const distance = response.data.rows[0].elements[0].distance.value;
              distanceCache.set(cacheKey, distance);
              if (distance > maxDistance) {
                console.log(`[findAvailableProviders] Provider ${provider._id} excluded: Distance ${distance}m exceeds ${maxDistance}m`);
                return null;
              }
              console.log(`[findAvailableProviders] Provider ${provider._id} included: Distance ${distance}m`);
            } else {
              const errorMessage = response.data.error_message || 'Unknown error';
              const elementStatus = response.data.rows?.[0]?.elements?.[0]?.status || 'N/A';
              console.log(`[findAvailableProviders] Distance Matrix failed for provider ${provider._id}: status=${response.data.status}, elementStatus=${elementStatus}, error=${errorMessage}`);
              if (response.data.status === 'REQUEST_DENIED') {
                console.error('[findAvailableProviders] Distance Matrix failed: REQUEST_DENIED, check API key configuration');
                return null;
              } else if (response.data.status === 'OVER_QUERY_LIMIT') {
                console.log(`[findAvailableProviders] API quota exceeded for provider ${provider._id}`);
              } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
                console.log(`[findAvailableProviders] Invalid or unroutable coordinates for provider ${provider._id}`);
              }
              if (bookingCity && provider.profile.location?.details?.city && 
                  bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
                console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
                return provider;
              }
              return null;
            }
          } catch (error) {
            console.error(`[findAvailableProviders] Distance Matrix error for provider ${provider._id}: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
            if (bookingCity && provider.profile.location?.details?.city && 
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
              return provider;
            }
            return null;
          }
        }
      } else if (bookingCity && provider.profile.location?.details?.city && 
          bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
        console.log(`[findAvailableProviders] Provider ${provider._id} included via city fallback: ${bookingCity}`);
        return provider;
      } else {
        console.log(`[findAvailableProviders] Provider ${provider._id} excluded: No valid coordinates or city match`);
        return null;
      }

      const bookingDate = new Date(scheduledTime);
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

      const availabilityString = provider.profile?.availability;
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

const assignProvider = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.body;
    const { bookingId } = req.params;

    if (!mongoose.isValidObjectId(bookingId) || !mongoose.isValidObjectId(providerId)) {
      console.error('[assignProvider] Invalid IDs:', { bookingId, providerId });
      return res.status(400).json({ message: 'Invalid booking or provider ID' });
    }

    const booking = await Booking.findById(bookingId).populate('service');
    if (!booking) {
      console.error('[assignProvider] Booking not found:', bookingId);
      return res.status(404).json({ message: 'Booking not found' });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider' || provider.profile.status !== 'active') {
      console.error('[assignProvider] Invalid or inactive provider:', providerId);
      return res.status(400).json({ message: 'Invalid or inactive provider' });
    }

    let bookingCoords = booking.coordinates;
    let bookingCity = booking.location?.trim();
    const isSimpleCity = bookingCity && !bookingCity.includes(',');

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('[assignProvider] GOOGLE_MAPS_API_KEY is not set');
      return res.status(500).json({ message: 'Server configuration error: Google Maps API key missing' });
    }

    if (!isSimpleCity && (!bookingCoords || !bookingCoords.lat || !bookingCoords.lng || 
        isNaN(bookingCoords.lat) || isNaN(bookingCoords.lng) || 
        bookingCoords.lat === 0 || bookingCoords.lng === 0 || 
        Math.abs(bookingCoords.lat) > 90 || Math.abs(bookingCoords.lng) > 180)) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.location)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        console.log('[assignProvider] Geocoding response:', {
          status: response.data.status,
          resultsCount: response.data.results.length,
          error_message: response.data.error_message || 'None'
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCoords = response.data.results[0].geometry.location;
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || booking.location;
          booking.coordinates = bookingCoords;
          await booking.save();
          console.log(`[assignProvider] Geocoded booking ${bookingId}: lat=${bookingCoords.lat}, lng=${bookingCoords.lng}, city=${bookingCity}`);
        } else if (response.data.status === 'REQUEST_DENIED') {
          console.error('[assignProvider] Geocoding failed: REQUEST_DENIED, check API key configuration');
          return res.status(500).json({ message: 'Geocoding failed: Invalid or disabled Google Maps API key' });
        } else if (response.data.status === 'ZERO_RESULTS') {
          console.warn('[assignProvider] No geocoding results for location:', booking.location);
          // Fallback to city
        } else {
          console.error('[assignProvider] Geocoding failed:', response.data.status, response.data.error_message);
          return res.status(400).json({ message: `Could not geocode booking location: ${response.data.status}` });
        }
      } catch (error) {
        console.error(`[assignProvider] Geocoding error for location ${booking.location}:`, error.message);
        return res.status(500).json({ message: 'Failed to geocode booking location: Server error' });
      }
    } else if (!bookingCity && bookingCoords?.lat && bookingCoords?.lng) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${bookingCoords.lat},${bookingCoords.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        console.log('[assignProvider] Reverse geocoding response:', {
          status: response.data.status,
          resultsCount: response.data.results.length,
          error_message: response.data.error_message || 'None'
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          bookingCity = response.data.results[0].address_components.find(comp => comp.types.includes('locality'))?.long_name || '';
          console.log(`[assignProvider] Reverse geocoded city for booking ${bookingId}: ${bookingCity}`);
        } else if (response.data.status === 'REQUEST_DENIED') {
          console.error('[assignProvider] Reverse geocoding failed: REQUEST_DENIED, check API key configuration');
          return res.status(500).json({ message: 'Reverse geocoding failed: Invalid or disabled Google Maps API key' });
        }
      } catch (error) {
        console.error(`[assignProvider] Reverse geocoding error for booking ${bookingId}:`, error.message);
      }
    } else {
      console.log('[assignProvider] Skipping geocoding, using location as city:', bookingCity);
    }

    if (!provider.profile.location?.coordinates || 
        isNaN(provider.profile.location.coordinates.lat) || 
        isNaN(provider.profile.location.coordinates.lng) || 
        provider.profile.location.coordinates.lat === 0 || 
        provider.profile.location.coordinates.lng === 0 || 
        Math.abs(provider.profile.location.coordinates.lat) > 90 || 
        Math.abs(provider.profile.location.coordinates.lng) > 180) {
      console.log(`[assignProvider] Provider ${providerId} excluded: Invalid or missing coordinates: ${JSON.stringify(provider.profile.location?.coordinates)}`);
      if (bookingCity && provider.profile.location?.details?.city && 
          bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
        console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
      } else {
        console.error('[assignProvider] No city fallback available for provider:', providerId);
        return res.status(400).json({ message: 'Provider location coordinates missing or invalid, and no city match' });
      }
    } else if (bookingCoords && bookingCoords.lat && bookingCoords.lng) {
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
          console.log('[assignProvider] Distance Matrix response:', {
            status: response.data.status,
            elementStatus: response.data.rows?.[0]?.elements?.[0]?.status || 'N/A',
            error_message: response.data.error_message || 'None'
          });

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
              console.error('[assignProvider] Distance Matrix failed: REQUEST_DENIED, check API key configuration');
              return res.status(500).json({ message: 'Distance calculation failed: Invalid or disabled Google Maps API key' });
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
              console.log(`[assignProvider] API quota exceeded for provider ${providerId}`);
            } else if (elementStatus === 'NOT_FOUND' || elementStatus === 'ZERO_RESULTS') {
              console.log(`[assignProvider] Invalid or unroutable coordinates for provider ${providerId}`);
            }
            if (bookingCity && provider.profile.location?.details?.city && 
                bookingCity.toLowerCase().trim() === provider.profile.location.details.city.toLowerCase().trim()) {
              console.log(`[assignProvider] Provider ${providerId} allowed via city fallback: ${bookingCity}`);
            } else {
              return res.status(400).json({ message: `Could not calculate distance to provider: ${errorMessage}` });
            }
          }
        } catch (error) {
          const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : error.message;
          console.error(`[assignProvider] Distance Matrix error for provider ${providerId}: ${errorDetails}`);
          if (bookingCity && provider.profile.location?.details?.city && 
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
    } else {
      console.error('[assignProvider] Socket.IO not initialized');
    }

    res.status(200).json({ message: 'Provider assigned successfully', booking });
  } catch (error) {
    console.error('[assignProvider] Error assigning provider:', error);
    res.status(500).json({ message: 'Server error while assigning provider' });
  }
});



































/* const findAvailableProviders = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.isValidObjectId(bookingId)) {
    res.status(400);
    throw new Error('Invalid booking ID format');
  }

  const booking = await Booking.findById(bookingId).populate('service customer');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.customer) {
    console.log(`Invalid booking customer: bookingId=${bookingId}`);
    res.status(400);
    throw new Error('Booking has no valid customer');
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
  const isImmediateBooking = Math.abs(bookingDate - now) < 5 * 60 * 1000;

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
        return provider;
      }

      const availabilityString = provider.profile?.availability;
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
}); */





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
