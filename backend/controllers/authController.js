const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

    // Generate and send OTP for registration verification
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>ServiceHub OTP Verification</h2>
        <p>Your one-time password (OTP) for registration is:</p>
        <h3 style="color: #007bff;">${otp}</h3>
        <p>This code expires in 10 minutes. Please enter it to complete your registration.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>ServiceHub Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your OTP for Registration Verification',
      html,
    });

    res.status(201).json({ needsVerification: true, message: 'OTP sent to your email' });
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
    const user = await User.findOne({ email }).select('+password +otp +otpExpires');
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

    let isTrusted = false;
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.id === user._id.toString()) {
          isTrusted = true;
        }
      } catch (err) {
        console.log('Invalid refresh token:', err.message);
      }
    }

    if (isTrusted) {
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
    } else {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>ServiceHub OTP Verification</h2>
          <p>Your one-time password (OTP) is:</p>
          <h3 style="color: #007bff;">${otp}</h3>
          <p>This code expires in 10 minutes. Please enter it to complete your login.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br>ServiceHub Team</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Your OTP for Verification',
        html,
      });

      res.json({ needsVerification: true, message: 'OTP sent to your email' });
    }
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
    const user = await User.findOne({ email, role: 'admin' }).select('+password +otp +otpExpires');
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

    let isTrusted = false;
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.id === user._id.toString()) {
          isTrusted = true;
        }
      } catch (err) {
        console.log('Invalid refresh token:', err.message);
      }
    }

    if (isTrusted) {
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
    } else {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>ServiceHub OTP Verification</h2>
          <p>Your one-time password (OTP) is:</p>
          <h3 style="color: #007bff;">${otp}</h3>
          <p>This code expires in 10 minutes. Please enter it to complete your login.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br>ServiceHub Team</p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Your OTP for Admin Verification',
        html,
      });

      res.json({ needsVerification: true, message: 'OTP sent to your email' });
    }
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

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>ServiceHub OTP Verification</h2>
        <p>Your one-time password (OTP) for admin registration is:</p>
        <h3 style="color: #007bff;">${otp}</h3>
        <p>This code expires in 10 minutes. Please enter it to complete your registration.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>ServiceHub Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your OTP for Admin Registration',
      html,
    });

    res.status(201).json({ needsVerification: true, message: 'OTP sent to your email' });
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

const adminVerifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    console.log('Missing email or OTP:', { email, otp });
    res.status(400);
    throw new Error('Please provide email and OTP');
  }

  try {
    const user = await User.findOne({ email, role: 'admin' }).select('+otp +otpExpires');
    console.log('Admin user query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No admin user found for email:', email);
      res.status(400);
      throw new Error('Invalid email or OTP');
    }

    if (!user.otp || !user.otpExpires) {
      console.log('No OTP or OTP expiry set for user:', user._id);
      res.status(400);
      throw new Error('OTP not found or expired');
    }

    if (user.otpExpires < Date.now()) {
      console.log('OTP expired for user:', user._id);
      res.status(400);
      throw new Error('OTP has expired');
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    console.log('OTP match result:', isMatch);

    if (!isMatch) {
      console.log('Invalid OTP for user:', user._id);
      res.status(400);
      throw new Error('Invalid OTP');
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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
    console.error('Admin OTP verification error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const adminResendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log('Missing email:', { email });
    res.status(400);
    throw new Error('Please provide email');
  }

  try {
    const user = await User.findOne({ email, role: 'admin' }).select('+otp +otpExpires');
    console.log('Admin user query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No admin user found for email:', email);
      res.status(404);
      throw new Error('Admin user not found');
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>ServiceHub OTP Verification</h2>
        <p>Your new one-time password (OTP) is:</p>
        <h3 style="color: #007bff;">${otp}</h3>
        <p>This code expires in 10 minutes. Please enter it to complete your verification.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>ServiceHub Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your New OTP for Admin Verification',
      html,
    });

    res.json({ message: 'OTP resent to your email' });
  } catch (err) {
    console.error('Admin resend OTP error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
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

    user.password = newPassword;
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

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    console.log('Missing email or OTP:', { email, otp });
    res.status(400);
    throw new Error('Please provide email and OTP');
  }

  try {
    const user = await User.findOne({ email }).select('+otp +otpExpires');
    console.log('User query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No user found for email:', email);
      res.status(400);
      throw new Error('Invalid email or OTP');
    }

    if (!user.otp || !user.otpExpires) {
      console.log('No OTP or OTP expiry set for user:', user._id);
      res.status(400);
      throw new Error('OTP not found or expired');
    }

    if (user.otpExpires < Date.now()) {
      console.log('OTP expired for user:', user._id);
      res.status(400);
      throw new Error('OTP has expired');
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    console.log('OTP match result:', isMatch);

    if (!isMatch) {
      console.log('Invalid OTP for user:', user._id);
      res.status(400);
      throw new Error('Invalid OTP');
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

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
    console.error('OTP verification error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log('Missing email:', { email });
    res.status(400);
    throw new Error('Please provide email');
  }

  try {
    const user = await User.findOne({ email }).select('+otp +otpExpires');
    console.log('User query result:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');

    if (!user) {
      console.log('No user found for email:', email);
      res.status(404);
      throw new Error('User not found');
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>ServiceHub OTP Verification</h2>
        <p>Your new one-time password (OTP) is:</p>
        <h3 style="color: #007bff;">${otp}</h3>
        <p>This code expires in 10 minutes. Please enter it to complete your verification.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>ServiceHub Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your New OTP for Verification',
      html,
    });

    res.json({ message: 'OTP resent to your email' });
  } catch (err) {
    console.error('Resend OTP error:', err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

module.exports = { register, login, adminLogin, adminSignup, adminVerifyOtp, adminResendOtp, resetPassword, verifyOtp, resendOtp, logout };
