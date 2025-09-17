const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  console.log('Register request body:', req.body);

  if (!name || !email || !password || !role) {
    console.log('Missing required fields');
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  if (!['customer', 'provider', 'admin'].includes(role)) {
    console.log('Invalid role:', role);
    res.status(400);
    throw new Error('Invalid role');
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      profile: role === 'provider' ? { skills: [], availability: 'Unavailable', location: { fullAddress: '', details: {}, coordinates: {} } } : {},
    });
    console.log('User created:', user ? user._id : 'null');

    if (!user) {
      console.log('Failed to create user');
      res.status(400);
      throw new Error('Failed to create user');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated');

    const response = {
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
    console.log('Register response:', response);
    res.status(201).json(response);
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'MongoServerError' && err.code === 11000) {
      res.status(400).json({ message: 'User with this email already exists' });
    } else {
      res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
      });
    }
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing email or password:', { email });
    res.status(400);
    throw new Error('Please provide email and password');
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    console.log('User query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No user found for email:', email);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      console.log('No password found for user:', user._id);
      res.status(500);
      throw new Error('User password not set');
    }

    console.log('Stored password hash (first 10 chars):', user.password.substring(0, 10));
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for user:', user._id);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error details:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing email or password:', { email });
    res.status(400);
    throw new Error('Please provide email and password');
  }

  try {
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    console.log('Admin user query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No admin user found for email:', email);
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    if (!user.password) {
      console.log('No password found for admin user:', user._id);
      res.status(500);
      throw new Error('Admin user password not set');
    }

    console.log('Stored password hash (first 10 chars):', user.password.substring(0, 10));
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for admin user:', user._id);
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Admin login error details:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const adminSignup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    console.log('Missing required fields:', { name, email, password });
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      profile: {},
    });
    console.log('Admin user created:', user ? user._id : 'null');

    if (!user) {
      console.log('Failed to create admin user');
      res.status(400);
      throw new Error('Failed to create admin user');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.status(201).json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Admin signup error:', err);
    if (err.name === 'MongoServerError' && err.code === 11000) {
      res.status(400).json({ message: 'User with this email already exists' });
    } else {
      res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
      });
    }
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    console.log('Missing email or newPassword:', { email });
    res.status(400);
    throw new Error('Please provide email and new password');
  }

  try {
    const user = await User.findOne({ email });
    console.log('User query result for reset:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No user found for email:', email);
      res.status(404);
      throw new Error('User not found');
    }

    if (newPassword.length < 8) {
      console.log('Password too short for user:', user._id);
      res.status(400);
      throw new Error('Password must be at least 8 characters');
    }

    user.password = newPassword; // Will be hashed by pre('save') hook
    await user.save();
    console.log('Password reset for user:', user._id, 'Role:', user.role);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

module.exports = { register, login, adminLogin, adminSignup, resetPassword };



























































//main
/* const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  console.log('Register request body:', req.body);

  if (!name || !email || !password || !role) {
    console.log('Missing required fields');
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  if (!['customer', 'provider', 'admin'].includes(role)) {
    console.log('Invalid role:', role);
    res.status(400);
    throw new Error('Invalid role');
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      profile: role === 'provider' ? { skills: [], availability: 'Unavailable', location: { fullAddress: '', details: {}, coordinates: {} } } : {},
    });
    console.log('User created:', user ? user._id : 'null');

    if (!user) {
      console.log('Failed to create user');
      res.status(400);
      throw new Error('Failed to create user');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated');

    const response = {
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
    console.log('Register response:', response);
    res.status(201).json(response);
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'MongoServerError' && err.code === 11000) {
      res.status(400).json({ message: 'User with this email already exists' });
    } else {
      res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
      });
    }
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing email or password:', { email });
    res.status(400);
    throw new Error('Please provide email and password');
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    console.log('User query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No user found for email:', email);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      console.log('No password found for user:', user._id);
      res.status(500);
      throw new Error('User password not set');
    }

    console.log('Stored password hash (first 10 chars):', user.password.substring(0, 10));
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for user:', user._id);
      res.status(401);
      throw new Error('Invalid email or password');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error details:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing email or password:', { email });
    res.status(400);
    throw new Error('Please provide email and password');
  }

  try {
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    console.log('Admin user query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No admin user found for email:', email);
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    if (!user.password) {
      console.log('No password found for admin user:', user._id);
      res.status(500);
      throw new Error('Admin user password not set');
    }

    console.log('Stored password hash (first 10 chars):', user.password.substring(0, 10));
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for admin user:', user._id);
      res.status(401);
      throw new Error('Invalid admin credentials');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Admin login error details:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const adminSignup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    console.log('Missing required fields:', { name, email, password });
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User already exists:', email);
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      profile: {},
    });
    console.log('Admin user created:', user ? user._id : 'null');

    if (!user) {
      console.log('Failed to create admin user');
      res.status(400);
      throw new Error('Failed to create admin user');
    }

    if (!process.env.JWT_SECRET) {
      console.log('JWT_SECRET is not defined');
      res.status(500);
      throw new Error('Server configuration error: JWT_SECRET not set');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    console.log('JWT token generated:', token.substring(0, 20) + '...');

    res.status(201).json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Admin signup error:', err);
    if (err.name === 'MongoServerError' && err.code === 11000) {
      res.status(400).json({ message: 'User with this email already exists' });
    } else {
      res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
      });
    }
  }
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    console.log('Missing email or newPassword:', { email });
    res.status(400);
    throw new Error('Please provide email and new password');
  }

  try {
    const user = await User.findOne({ email, role: 'admin' });
    console.log('Admin user query result for reset:', user ? { _id: user._id, email: user.email } : 'null');

    if (!user) {
      console.log('No admin user found for email:', email);
      res.status(404);
      throw new Error('Admin user not found');
    }

    user.password = newPassword; // Will be hashed by pre('save') hook
    await user.save();
    console.log('Password reset for admin user:', user._id);

    res.status(200).json({ message: 'Admin password reset successfully' });
  } catch (err) {
    console.error('Admin password reset error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

module.exports = { register, login, adminLogin, adminSignup, resetAdminPassword }; */



































