const express = require('express');
const router = express.Router();
const { register, login, adminLogin, adminSignup, adminVerifyOtp, adminResendOtp, resetPassword, verifyOtp, resendOtp, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/admin-signup', adminSignup);
router.post('/admin-verify-otp', adminVerifyOtp);
router.post('/admin-resend-otp', adminResendOtp);
router.post('/admin/reset-password', resetPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', authMiddleware, logout);

router.use((err, req, res, next) => {
  console.error('Route error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = router;









































/* // authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, adminLogin, adminSignup, resetPassword, verifyOtp, resendOtp, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/admin-signup', adminSignup);
router.post('/admin/reset-password', resetPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', authMiddleware, logout);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = router; */










































//main
/* 
 // authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, adminLogin, adminSignup,resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/admin-signup', adminSignup);
router.post('/admin/reset-password', resetPassword);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = router;  */