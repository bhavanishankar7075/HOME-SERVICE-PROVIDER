const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  toggleStatus,
  toggleAvailability,
  contactAdmin,
  getCustomerMessages,
  getSubscriptionDetails // Already included in previous update
} = require('../controllers/userController');

const { resetPassword } = require('../controllers/authController');

// Import express-validator functions
const { param, body } = require('express-validator');
const mongoose = require('mongoose');

console.log('registerUser:', typeof registerUser);
console.log('loginUser:', typeof loginUser);
console.log('getProfile:', typeof getProfile);
console.log('updateProfile:', typeof updateProfile);
console.log('changePassword:', typeof changePassword);
console.log('deleteAccount:', typeof deleteAccount);
console.log('toggleStatus:', typeof toggleStatus);
console.log('toggleAvailability:', typeof toggleAvailability);
console.log('resetPassword:', typeof resetPassword);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware(['customer', 'provider', 'admin']), getProfile);

router.get(
    '/messages',
    authMiddleware(['customer']),
    getCustomerMessages
);

router.put('/profile', [
  authMiddleware(['customer', 'provider', 'admin']),
  body('profile').optional().custom((value) => {
    if (value) {
      if (value.skills && !Array.isArray(value.skills)) throw new Error('Skills must be an array');
      if (value.availability && typeof value.availability !== 'string') throw new Error('Availability must be a string');
      if (value.location) {
        if (typeof value.location !== 'object') throw new Error('Location must be an object');
        if (value.location.fullAddress && typeof value.location.fullAddress !== 'string') throw new Error('Location fullAddress must be a string');
      }
      if (value.image && typeof value.image !== 'string') throw new Error('Image must be a string');
      if (value.feedback) {
        if (!Array.isArray(value.feedback)) throw new Error('Feedback must be an array');
        value.feedback.forEach(item => {
          if (!item.serviceId || !mongoose.Types.ObjectId.isValid(item.serviceId)) throw new Error('Invalid serviceId in feedback');
          if (typeof item.feedback !== 'string') throw new Error('Feedback text must be a string');
        });
      }
      if (value.bookedServices) {
        if (!Array.isArray(value.bookedServices)) throw new Error('Booked Services must be an array');
        value.bookedServices.forEach(id => {
          if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid service ID in bookedServices');
        });
      }
    }
    return true;
  })
], updateProfile);
router.put('/change-password', authMiddleware(['customer', 'provider', 'admin']), changePassword);
router.delete('/delete', authMiddleware(['customer', 'provider']), deleteAccount);

router.post(
    '/contact-admin', 
    authMiddleware(['customer']),
    contactAdmin
);

router.put('/profile/:userId/toggle-status', [
  authMiddleware(['provider']),
  param('userId').custom((value, { req }) => {
    if (value !== req.user._id.toString()) {
      throw new Error('Cannot toggle status for another user');
    }
    return true;
  }),
], toggleStatus);

router.put('/profile/:userId/toggle-availability', [
  authMiddleware(['provider']),
  param('userId').custom((value, { req }) => {
    if (value !== req.user._id.toString()) {
      throw new Error('Cannot toggle availability for another user');
    }
    return true;
  }),
], toggleAvailability);

router.post('/reset-password', resetPassword);

// Route for subscription details (already included)
router.get('/subscription-details', authMiddleware(['provider']), getSubscriptionDetails);

module.exports = router;
