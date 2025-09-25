const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const Plan = require('../models/Plan');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const storage = multer.diskStorage({
  destination: './Uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const convertToCity = async (address) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const addressComponents = response.data.results[0].address_components;
      const { lat, lng } = response.data.results[0].geometry.location;
      return {
        fullAddress: response.data.results[0].formatted_address || address,
        details: {
          streetNumber: addressComponents.find(comp => comp.types.includes('street_number'))?.long_name || '',
          street: addressComponents.find(comp => comp.types.includes('route'))?.long_name || '',
          city: addressComponents.find(comp => comp.types.includes('locality'))?.long_name || '',
          state: addressComponents.find(comp => comp.types.includes('administrative_area_level_1'))?.long_name || '',
          country: addressComponents.find(comp => comp.types.includes('country'))?.long_name || '',
          postalCode: addressComponents.find(comp => comp.types.includes('postal_code'))?.long_name || ''
        },
        coordinates: { lat, lng }
      };
    }
    console.log(`[convertToCity] Geocoding failed for address: ${address}`);
    return {
      fullAddress: address,
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
  } catch (error) {
    console.error(`[convertToCity] Geocoding error for address ${address}: ${error.message}`);
    return {
      fullAddress: address,
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
  }
};

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  let bookingLimit = 5; // Default for Free plan
  if (user.subscriptionTier && ['pro', 'elite'].includes(user.subscriptionTier)) {
    const plan = await Plan.findOne({ name: user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) });
    bookingLimit = plan ? plan.bookingLimit : bookingLimit;
  }

  let subscriptionStatusMessage = '';
  if (user.subscriptionStatus === 'past_due') {
    subscriptionStatusMessage = 'Payment required to restore active status.';
  } else if (user.subscriptionTier !== 'free' && user.subscriptionStartDate) {
    const expiryDate = new Date(user.subscriptionStartDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      subscriptionStatusMessage = `Subscription expires in ${daysUntilExpiry} day(s).`;
      if (global.io) {
        global.io.to(user._id.toString()).emit('subscriptionWarning', {
          message: `Your ${user.subscriptionTier} subscription expires in ${daysUntilExpiry} day(s). Please renew to continue receiving bookings.`
        });
      }
    }
  }

  console.log('[getProfile] Returning user:', {
    userId: user._id,
    name: user.name,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    currentBookingCount: user.currentBookingCount,
    bookingLimit,
    subscriptionStatusMessage,
    profileExists: !!user.profile,
    profileImage: user.profile?.image || '/images/default-user.png'
  });

  res.json({
    ...user.toObject(),
    bookingLimit,
    subscriptionStatusMessage
  });
});

const updateProfile = [
  upload.single('profileImage'),
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    const name = req.body.name ? req.body.name.trim() : currentUser.name;
    const phone = req.body.phone || currentUser.phone;
    let locationInput = req.body.location;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    let location = currentUser.profile?.location || {
      fullAddress: '',
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
    if (locationInput) {
      console.log('Location input received in updateProfile:', locationInput);
      if (typeof locationInput === 'string') {
        try {
          locationInput = JSON.parse(locationInput);
        } catch (e) {
          // Treat as string address
        }
      }
      if (typeof locationInput === 'string') {
        location = await convertToCity(locationInput);
      } else if (locationInput.fullAddress && typeof locationInput.fullAddress === 'string') {
        location = await convertToCity(locationInput.fullAddress);
        if (locationInput.details) {
          location.details = {
            streetNumber: locationInput.details.streetNumber || location.details.streetNumber,
            street: locationInput.details.street || location.details.street,
            city: locationInput.details.city || location.details.city,
            state: locationInput.details.state || location.details.state,
            country: locationInput.details.country || location.details.country,
            postalCode: locationInput.details.postalCode || location.details.postalCode
          };
        }
      } else {
        location = { ...location, ...locationInput };
      }
      console.log('Mapped location for update:', location);
    }

    const updateData = {
      name,
      phone,
      profile: {
        ...currentUser.profile,
        location,
        image: currentUser.profile?.image || '/images/default-user.png',
        skills: currentUser.profile?.skills || [],
        availability: req.body.availability || currentUser.profile?.availability || 'Unavailable',
        status: currentUser.profile?.status || 'active',
        feedback: currentUser.profile?.feedback || [],
        bookedServices: currentUser.profile?.bookedServices || []
      }
    };

    if (req.body.skills) {
      updateData.profile.skills = req.body.skills.split(',').map(skill => skill.trim());
    }
    if (req.file) {
      updateData.profile.image = `/Uploads/${req.file.filename}`;
    }

    console.log('[updateProfile] Updating with data:', updateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('[updateProfile] Returning updated user:', {
      userId: updatedUser._id,
      name: updatedUser.name,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      profileExists: !!updatedUser.profile,
      profileImage: updatedUser.profile?.image,
      location: updatedUser.profile?.location
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
    }

    res.json(updatedUser);
  })
];

const toggleStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.profile.status = user.profile.status === 'active' ? 'inactive' : 'active';
  await user.save();

  const updatedUser = await User.findById(userId).select('-password');
  console.log('[toggleStatus] Returning user:', {
    userId: updatedUser._id,
    status: updatedUser.profile.status,
    subscriptionTier: updatedUser.subscriptionTier,
    subscriptionStatus: updatedUser.subscriptionStatus
  });

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
  }

  res.json(updatedUser);
});

const toggleAvailability = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.profile.availability = user.profile.availability === 'Available' ? 'Unavailable' : 'Available';
  await user.save();

  const updatedUser = await User.findById(userId).select('-password');
  console.log('[toggleAvailability] Returning user:', {
    userId: updatedUser._id,
    availability: updatedUser.profile.availability,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus
  });

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
  }

  res.json(updatedUser);
});

const cancelSubscription = asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(500);
    throw new Error('Stripe payment service is not available');
  }

  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.subscriptionTier === 'free') {
    return res.status(400).json({ message: 'No active subscription to cancel' });
  }

  console.log('[cancelSubscription] Before update:', {
    userId: user._id,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    stripeSubscriptionId: user.stripeSubscriptionId
  });

  try {
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription.status === 'canceled') {
          console.log(`[cancelSubscription] Subscription ${user.stripeSubscriptionId} already canceled`);
        } else {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log(`[cancelSubscription] Stripe subscription ${user.stripeSubscriptionId} canceled`);
        }
      } catch (stripeError) {
        console.error(`[cancelSubscription] Stripe error: ${stripeError.message}`);
        if (stripeError.code !== 'resource_missing') {
          throw new Error(`Stripe cancellation failed: ${stripeError.message}`);
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          subscriptionTier: 'free', 
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
          currentBookingCount: 0, // Reset booking count
          subscriptionStartDate: null // Clear start date
        } 
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('Failed to update user subscription');
    }

    console.log('[cancelSubscription] After update:', {
      userId: updatedUser._id,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      stripeSubscriptionId: updatedUser.stripeSubscriptionId
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('subscriptionUpdated', {
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        message: 'Your subscription has been canceled. You have been downgraded to the free plan.'
      });
    }

    res.json({
      message: 'Subscription canceled successfully',
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus
    });
  } catch (error) {
    console.error('[cancelSubscription] Error:', error.message);
    res.status(500);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ message: 'Password changed successfully' });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await User.findByIdAndDelete(userId);

  if (global.io) {
    global.io.to(userId.toString()).emit('userDeleted', { _id: userId });
  }

  res.json({ message: 'Account deleted successfully' });
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, location } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  let userLocation = {
    fullAddress: '',
    details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
    coordinates: { lat: null, lng: null }
  };
  if (location) {
    userLocation = await convertToCity(location);
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    phone,
    role,
    profile: {
      location: userLocation,
      image: '/images/default-user.png',
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    },
    subscriptionTier: 'free',
    subscriptionStatus: 'inactive',
    currentBookingCount: 0,
    subscriptionStartDate: null
  });

  console.log('[registerUser] User created:', {
    userId: user._id,
    name: user.name,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.profile) {
    user.profile = {
      image: '/images/default-user.png',
      location: {
        fullAddress: '',
        details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
        coordinates: { lat: null, lng: null }
      },
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    };
  }

  if (await bcrypt.compare(password, user.password)) {
    const token = require('jsonwebtoken').sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const userResponse = await User.findById(user._id).select('-password');
    res.json({
      _id: userResponse._id,
      name: userResponse.name,
      email: userResponse.email,
      phone: userResponse.phone,
      role: userResponse.role,
      profile: userResponse.profile,
      subscriptionTier: userResponse.subscriptionTier,
      subscriptionStatus: userResponse.subscriptionStatus,
      currentBookingCount: userResponse.currentBookingCount,
      token
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const contactAdmin = asyncHandler(async (req, res) => {
  const { providerId, providerName, message } = req.body;
  const customerId = req.user._id;

  if (!providerId || !providerName || !message) {
    res.status(400);
    throw new Error('Provider details and a message are required.');
  }

  const newMessage = await Message.create({
    customerId,
    providerId,
    providerName,
    message
  });

  if (newMessage) {
    if (global.io) {
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('customerId', 'name email')
        .populate('providerId', 'name');
      global.io.emit('newAdminMessage', populatedMessage);
    }
    res.status(201).json({ message: 'Message sent successfully to admin.' });
  } else {
    res.status(500);
    throw new Error('Failed to save the message.');
  }
});

const getCustomerMessages = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const messages = await Message.find({ customerId: customerId })
    .populate('providerId', 'name profile.image')
    .sort({ createdAt: -1 });

  res.status(200).json(messages);
});

// New endpoint for providers to view subscription details
const getSubscriptionDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('subscriptionTier subscriptionStatus currentBookingCount subscriptionStartDate stripeSubscriptionId');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  let bookingLimit = 5; // Default for Free plan
  if (user.subscriptionTier && ['pro', 'elite'].includes(user.subscriptionTier)) {
    const plan = await Plan.findOne({ name: user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) });
    bookingLimit = plan ? plan.bookingLimit : bookingLimit;
  }

  let subscriptionStatusMessage = '';
  if (user.subscriptionStatus === 'past_due') {
    subscriptionStatusMessage = 'Payment required to restore active status.';
  } else if (user.subscriptionTier !== 'free' && user.subscriptionStartDate) {
    const expiryDate = new Date(user.subscriptionStartDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      subscriptionStatusMessage = `Subscription expires in ${daysUntilExpiry} day(s).`;
      if (global.io) {
        global.io.to(user._id.toString()).emit('subscriptionWarning', {
          message: `Your ${user.subscriptionTier} subscription expires in ${daysUntilExpiry} day(s). Please renew to continue receiving bookings.`
        });
      }
    }
  }

  res.json({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    currentBookingCount: user.currentBookingCount,
    bookingLimit,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionStatusMessage
  });
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  toggleStatus,
  toggleAvailability,
  cancelSubscription,
  contactAdmin,
  getCustomerMessages,
  getSubscriptionDetails
};



























































































































//main
/* const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const storage = multer.diskStorage({
  destination: './Uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const convertToCity = async (address) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const addressComponents = response.data.results[0].address_components;
      const { lat, lng } = response.data.results[0].geometry.location;
      return {
        fullAddress: response.data.results[0].formatted_address || address,
        details: {
          streetNumber: addressComponents.find(comp => comp.types.includes('street_number'))?.long_name || '',
          street: addressComponents.find(comp => comp.types.includes('route'))?.long_name || '',
          city: addressComponents.find(comp => comp.types.includes('locality'))?.long_name || '',
          state: addressComponents.find(comp => comp.types.includes('administrative_area_level_1'))?.long_name || '',
          country: addressComponents.find(comp => comp.types.includes('country'))?.long_name || '',
          postalCode: addressComponents.find(comp => comp.types.includes('postal_code'))?.long_name || ''
        },
        coordinates: { lat, lng }
      };
    }
    console.log(`[convertToCity] Geocoding failed for address: ${address}`);
    return {
      fullAddress: address,
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
  } catch (error) {
    console.error(`[convertToCity] Geocoding error for address ${address}: ${error.message}`);
    return {
      fullAddress: address,
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
  }
};

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  console.log('[getProfile] Returning user:', {
    userId: user._id,
    name: user.name,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    profileExists: !!user.profile,
    profileImage: user.profile?.image || '/images/default-user.png'
  });

  res.json(user);
});

const updateProfile = [
  upload.single('profileImage'),
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    const name = req.body.name ? req.body.name.trim() : currentUser.name;
    const phone = req.body.phone || currentUser.phone;
    let locationInput = req.body.location;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    let location = currentUser.profile?.location || {
      fullAddress: '',
      details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
      coordinates: { lat: null, lng: null }
    };
    if (locationInput) {
      console.log('Location input received in updateProfile:', locationInput);
      if (typeof locationInput === 'string') {
        try {
          locationInput = JSON.parse(locationInput);
        } catch (e) {
          // Treat as string address
        }
      }
      if (typeof locationInput === 'string') {
        location = await convertToCity(locationInput);
      } else if (locationInput.fullAddress && typeof locationInput.fullAddress === 'string') {
        location = await convertToCity(locationInput.fullAddress);
        if (locationInput.details) {
          location.details = {
            streetNumber: locationInput.details.streetNumber || location.details.streetNumber,
            street: locationInput.details.street || location.details.street,
            city: locationInput.details.city || location.details.city,
            state: locationInput.details.state || location.details.state,
            country: locationInput.details.country || location.details.country,
            postalCode: locationInput.details.postalCode || location.details.postalCode
          };
        }
      } else {
        location = { ...location, ...locationInput };
      }
      console.log('Mapped location for update:', location);
    }

    const updateData = {
      name,
      phone,
      profile: {
        ...currentUser.profile,
        location,
        image: currentUser.profile?.image || '/images/default-user.png',
        skills: currentUser.profile?.skills || [],
        availability: req.body.availability || currentUser.profile?.availability || 'Unavailable',
        status: currentUser.profile?.status || 'active',
        feedback: currentUser.profile?.feedback || [],
        bookedServices: currentUser.profile?.bookedServices || []
      }
    };

    if (req.body.skills) {
      updateData.profile.skills = req.body.skills.split(',').map(skill => skill.trim());
    }
    if (req.file) {
      updateData.profile.image = `/Uploads/${req.file.filename}`;
    }

    console.log('[updateProfile] Updating with data:', updateData);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('[updateProfile] Returning updated user:', {
      userId: updatedUser._id,
      name: updatedUser.name,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      profileExists: !!updatedUser.profile,
      profileImage: updatedUser.profile?.image,
      location: updatedUser.profile?.location
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
    }

    res.json(updatedUser);
  })
];

const toggleStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.profile.status = user.profile.status === 'active' ? 'inactive' : 'active';
  await user.save();

  const updatedUser = await User.findById(userId).select('-password');
  console.log('[toggleStatus] Returning user:', {
    userId: updatedUser._id,
    status: updatedUser.profile.status,
    subscriptionTier: updatedUser.subscriptionTier,
    subscriptionStatus: updatedUser.subscriptionStatus
  });

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
  }

  res.json(updatedUser);
});

const toggleAvailability = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.profile.availability = user.profile.availability === 'Available' ? 'Unavailable' : 'Available';
  await user.save();

  const updatedUser = await User.findById(userId).select('-password');
  console.log('[toggleAvailability] Returning user:', {
    userId: updatedUser._id,
    availability: updatedUser.profile.availability,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus
  });

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', updatedUser.toObject());
  }

  res.json(updatedUser);
});

const cancelSubscription = asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(500);
    throw new Error('Stripe payment service is not available');
  }

  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.subscriptionTier === 'free') {
    return res.status(400).json({ message: 'No active subscription to cancel' });
  }

  console.log('[cancelSubscription] Before update:', {
    userId: user._id,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    stripeSubscriptionId: user.stripeSubscriptionId
  });

  try {
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription.status === 'canceled') {
          console.log(`[cancelSubscription] Subscription ${user.stripeSubscriptionId} already canceled`);
        } else {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log(`[cancelSubscription] Stripe subscription ${user.stripeSubscriptionId} canceled`);
        }
      } catch (stripeError) {
        console.error(`[cancelSubscription] Stripe error: ${stripeError.message}`);
        if (stripeError.code !== 'resource_missing') {
          throw new Error(`Stripe cancellation failed: ${stripeError.message}`);
        }
        // If subscription not found in Stripe, proceed with database update
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          subscriptionTier: 'free', 
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
          stripeCustomerId: user.stripeCustomerId // Preserve stripeCustomerId for future subscriptions
        } 
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('Failed to update user subscription');
    }

    console.log('[cancelSubscription] After update:', {
      userId: updatedUser._id,
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      stripeSubscriptionId: updatedUser.stripeSubscriptionId
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('subscriptionUpdated', {
        subscriptionTier: updatedUser.subscriptionTier,
        subscriptionStatus: updatedUser.subscriptionStatus
      });
    }

    res.json({
      message: 'Subscription canceled successfully',
      subscriptionTier: updatedUser.subscriptionTier,
      subscriptionStatus: updatedUser.subscriptionStatus
    });
  } catch (error) {
    console.error('[cancelSubscription] Error:', error.message);
    res.status(500);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters long');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({ message: 'Password changed successfully' });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await User.findByIdAndDelete(userId);

  if (global.io) {
    global.io.to(userId.toString()).emit('userDeleted', { _id: userId });
  }

  res.json({ message: 'Account deleted successfully' });
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, location } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error('All fields are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  let userLocation = {
    fullAddress: '',
    details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
    coordinates: { lat: null, lng: null }
  };
  if (location) {
    userLocation = await convertToCity(location);
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    phone,
    role,
    profile: {
      location: userLocation,
      image: '/images/default-user.png',
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    },
    subscriptionTier: 'free',
    subscriptionStatus: 'inactive'
  });

  console.log('[registerUser] User created:', {
    userId: user._id,
    name: user.name,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.profile) {
    user.profile = {
      image: '/images/default-user.png',
      location: {
        fullAddress: '',
        details: { streetNumber: '', street: '', city: '', state: '', country: '', postalCode: '' },
        coordinates: { lat: null, lng: null }
      },
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    };
  }

  if (await bcrypt.compare(password, user.password)) {
    const token = require('jsonwebtoken').sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const userResponse = await User.findById(user._id).select('-password');
    res.json({
      _id: userResponse._id,
      name: userResponse.name,
      email: userResponse.email,
      phone: userResponse.phone,
      role: userResponse.role,
      profile: userResponse.profile,
      subscriptionTier: userResponse.subscriptionTier,
      subscriptionStatus: userResponse.subscriptionStatus,
      token
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const contactAdmin = asyncHandler(async (req, res) => {
  const { providerId, providerName, message } = req.body;
  const customerId = req.user._id;

  if (!providerId || !providerName || !message) {
    res.status(400);
    throw new Error('Provider details and a message are required.');
  }

  const newMessage = await Message.create({
    customerId,
    providerId,
    providerName,
    message
  });

  if (newMessage) {
    if (global.io) {
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('customerId', 'name email')
        .populate('providerId', 'name');
      global.io.emit('newAdminMessage', populatedMessage);
    }
    res.status(201).json({ message: 'Message sent successfully to admin.' });
  } else {
    res.status(500);
    throw new Error('Failed to save the message.');
  }
});

const getCustomerMessages = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const messages = await Message.find({ customerId: customerId })
    .populate('providerId', 'name profile.image')
    .sort({ createdAt: -1 });

  res.status(200).json(messages);
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  toggleStatus,
  toggleAvailability,
  cancelSubscription,
  contactAdmin,
  getCustomerMessages
}; */
