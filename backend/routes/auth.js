// authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, adminLogin, adminSignup } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/admin-signup', adminSignup);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Route error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = router;