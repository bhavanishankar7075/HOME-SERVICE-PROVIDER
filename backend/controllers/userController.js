const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');

const storage = multer.diskStorage({
  destination: './Uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const convertToCity = async (location) => {
  if (!location || typeof location !== 'string') {
    return {
      fullAddress: '',
      details: {
        streetNumber: '',
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      }
    };
  }
  const [lat, lng] = location.split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lng)) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=street_address|locality&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const address = response.data.results.find(result => result.types.includes('street_address'))
          || response.data.results.find(result => result.types.includes('locality'))
          || response.data.results[0];
        const components = address.address_components || [];
        const details = {
          streetNumber: components.find(c => c.types.includes('street_number'))?.long_name || '',
          street: components.find(c => c.types.includes('route'))?.long_name || '',
          city: components.find(c => c.types.includes('locality'))?.long_name || '',
          state: components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
          country: components.find(c => c.types.includes('country'))?.long_name || '',
          postalCode: components.find(c => c.types.includes('postal_code'))?.long_name || ''
        };
        console.log('Converted location:', { fullAddress: address.formatted_address, details }); // Debug log
        return {
          fullAddress: address.formatted_address || '',
          details
        };
      }
      return {
        fullAddress: location,
        details: {
          streetNumber: '',
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        }
      };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return {
        fullAddress: location,
        details: {
          streetNumber: '',
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        }
      };
    }
  }
  return {
    fullAddress: location,
    details: {
      streetNumber: '',
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    }
  };
};

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profile: user.profile,
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
    let locationInput = req.body.location ? JSON.parse(req.body.location) : currentUser.profile.location;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    let location = { ...currentUser.profile.location };
    if (locationInput) {
      console.log('Location input:', locationInput); // Debug log
      if (typeof locationInput === 'string') {
        location = await convertToCity(locationInput);
      } else if (locationInput.fullAddress && typeof locationInput.fullAddress === 'string') {
        const components = Array.isArray(locationInput.details) ? locationInput.details : [];
        location = {
          fullAddress: locationInput.fullAddress,
          details: {
            streetNumber: locationInput.details?.streetNumber || components.find(c => c.types?.includes('street_number'))?.long_name || '',
            street: locationInput.details?.street || components.find(c => c.types?.includes('route'))?.long_name || '',
            city: locationInput.details?.city || components.find(c => c.types?.includes('locality'))?.long_name || '',
            state: locationInput.details?.state || components.find(c => c.types?.includes('administrative_area_level_1'))?.long_name || '',
            country: locationInput.details?.country || components.find(c => c.types?.includes('country'))?.long_name || '',
            postalCode: locationInput.details?.postalCode || components.find(c => c.types?.includes('postal_code'))?.long_name || ''
          }
        };
      } else {
        location = { ...location, ...locationInput };
      }
    }
    console.log('Mapped location:', location); // Debug log

    const updateData = {
      name,
      phone,
      'profile.location': location,
    };

    if (req.body.skills) {
      updateData['profile.skills'] = req.body.skills.split(',').map(skill => skill.trim());
    }
    if (req.body.availability) {
      updateData['profile.availability'] = req.body.availability;
    }
    if (req.file) {
      updateData['profile.image'] = `/Uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (global.io) {
      global.io.to(userId.toString()).emit('userUpdated', updatedUser);
    }

    res.json(updatedUser);
  }),
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

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', user);
  }

  res.json({ message: `Status updated to ${user.profile.status}`, status: user.profile.status });
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

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', user);
  }

  res.json({ message: `Availability updated to ${user.profile.availability}`, availability: user.profile.availability });
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

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
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

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    profile: {
      location: location || {
        fullAddress: '',
        details: {
          streetNumber: '',
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        }
      },
      image: '',
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    },
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      token: 'dummy-token',
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
    message,
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
  contactAdmin,
  getCustomerMessages
};














































/* const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Message = require('../models/Message');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');

const storage = multer.diskStorage({
  destination: './Uploads/', // Match the uppercase folder name
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const convertToCity = async (location) => {
  if (!location || typeof location !== 'string') {
    return { city: null, fullAddress: null, details: {} };
  }
  const [lat, lng] = location.split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lng)) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const formattedAddress = response.data.results[0].formatted_address;
        return { city: null, fullAddress: formattedAddress, details: {} };
      }
      return { city: null, fullAddress: location, details: {} };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return { city: null, fullAddress: location, details: {} };
    }
  }
  return { city: null, fullAddress: location, details: {} };
};

const getProfile = asyncHandler(async (req, res) => {
  // CORRECTED: This function now only fetches the latest user data from the database.
  // It is faster and guarantees the data is always fresh.
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Send the complete, up-to-date user object
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profile: user.profile,
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

    // Manually parse fields because of FormData
    const name = req.body.name ? req.body.name.trim() : currentUser.name;
    const phone = req.body.phone || currentUser.phone;
    const locationInput = req.body.location ? JSON.parse(req.body.location) : currentUser.profile.location;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' });
    }

    let location = { ...currentUser.profile.location };
    if (locationInput) {
      if (typeof locationInput === 'string') {
        location = await convertToCity(locationInput);
      } else if (locationInput.fullAddress && typeof locationInput.fullAddress === 'string') {
        location.fullAddress = locationInput.fullAddress;
        location.details = locationInput.details || {};
      } else {
        location = { ...location, ...locationInput };
      }
    }

    const updateData = {
      name,
      phone,
      'profile.location': location,
    };

    if (req.file) {
      updateData['profile.image'] = `/Uploads/${req.file.filename}`; // Use uppercase to be consistent
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (global.io) {
      global.io.to(userId.toString()).emit('userUpdated', updatedUser);
    }

    res.json(updatedUser);
  }),
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

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', user);
  }

  res.json({ message: `Status updated to ${user.profile.status}`, status: user.profile.status });
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

  if (global.io) {
    global.io.to(userId.toString()).emit('userUpdated', user);
  }

  res.json({ message: `Availability updated to ${user.profile.availability}`, availability: user.profile.availability });
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

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
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

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    profile: {
      location: location || { city: null, fullAddress: null, details: {} },
      image: '',
      skills: [],
      availability: 'Unavailable',
      status: 'active',
      feedback: [],
      bookedServices: []
    },
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // In a real application, you would generate and return a JWT here
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      token: 'dummy-token', 
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
      message,
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
    contactAdmin,
    getCustomerMessages
}; */




















/* const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcrypt');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const convertToCity = async (location) => {
  if (!location || typeof location !== 'string' || !location.includes(',')) {
    console.log('Invalid location input:', location);
    return null;
  }
  const [lat, lng] = location.split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) {
    console.log('Invalid coordinates:', location);
    return null;
  }
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyCN6HiZ5BGIdkEDuavAu8Bb5XdNqEwwsZY`
    );
    if (response.data.status === 'OK') {
      let city = null;
      response.data.results[0]?.address_components.forEach(component => {
        if (component.types.includes('locality')) city = component.long_name;
      });
      console.log('Geocoded location:', { input: location, city });
      return city || location;
    }
    console.log('Geocoding failed, status not OK, returning original:', location);
    return location;
  } catch (error) {
    console.error('Geocoding error (API may be down):', error.message);
    return location;
  }
};

const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.profile) {
    user.profile = { location: null, image: '', skills: [], availability: 'Unavailable', status: 'active' };
    await user.save();
    console.log('Initialized new profile for user:', user._id);
  }

  let location = user.profile.location;
  if (location && typeof location === 'string' && location.includes(',')) {
    const city = await convertToCity(location);
    if (city && city !== location) {
      user.profile.location = city;
      await user.save();
      console.log('Updated location to city:', city);
    }
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profile: {
      skills: user.profile.skills || [],
      availability: user.profile.availability || 'Unavailable',
      location: user.profile.location || null,
      image: user.profile.image || '',
      status: user.profile.status || 'active',
    },
  });
});

const updateProfile = [
  upload.single('profileImage'),
  asyncHandler(async (req, res) => {
    const { name, phone, skills, availability, location, status } = req.body;
    const userId = req.user._id;

    console.log('Received update data:', { name, phone, skills, availability, location, status });

    const updateData = { name, phone };
    if (skills) updateData['profile.skills'] = skills.split(',').map(skill => skill.trim());
    if (availability) updateData['profile.availability'] = availability;
    if (location || (location === '' && req.file)) {
      const formLocation = location || (req.file ? null : '');
      console.log('Processing location:', formLocation);
      if (formLocation) {
        const city = await convertToCity(formLocation);
        updateData['profile.location'] = city || formLocation;
      }
    }
    if (status) updateData['profile.status'] = status;
    if (req.file) updateData['profile.image'] = `/uploads/${req.file.filename}`;
    else if (!req.body.image && req.user.profile.image) updateData['profile.image'] = req.user.profile.image;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) throw new Error('User not found');

    console.log('Updated user profile:', updatedUser);

    if (global.io) {
      global.io.to(userId.toString()).emit('profileUpdated', updatedUser);
    }

    res.json(updatedUser);
  }),
];

const toggleStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userId; // Use params for admin control
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const newStatus = user.profile.status === 'active' ? 'inactive' : 'active';
  user.profile.status = newStatus;
  await user.save();

  if (global.io) {
    global.io.to(userId.toString()).emit('profileUpdated', user);
  }

  res.json({ message: `Status updated to ${newStatus}`, status: newStatus });
});

const toggleAvailability = asyncHandler(async (req, res) => {
  const userId = req.params.userId; // Use params for admin control
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const newAvailability = user.profile.availability === 'Available' ? 'Unavailable' : 'Available';
  user.profile.availability = newAvailability;
  await user.save();

  if (global.io) {
    global.io.to(userId.toString()).emit('profileUpdated', user);
  }

  res.json({ message: `Availability updated to ${newAvailability}`, availability: newAvailability });
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

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: 'Password changed successfully' });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await User.findByIdAndDelete(userId);

  if (global.io) {
    global.io.to(userId.toString()).emit('accountDeleted', { message: 'Account deleted successfully' });
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

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    profile: { location: location || null, image: '', skills: [], availability: 'Unavailable', status: 'active' },
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: 'dummy-token',
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

module.exports = { registerUser, loginUser, getProfile, updateProfile, changePassword, deleteAccount, toggleStatus, toggleAvailability }; */