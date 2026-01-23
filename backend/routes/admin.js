const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    updateUserRole, 
    deleteUser, 
    updateUser, 
    getMessages,
    markMessageAsRead,
    deleteMessage,
    replyToMessage,
    bulkMarkAsRead,
    bulkDelete,
    updateServiceSlots,
    getLogs, 
    deleteLog, 
    deleteLogsBulk,
    updateSettings,
    getActiveProviders,
    assignProvider,
    getProviderSubscriptions,
    cancelProviderSubscription,
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { param, body, query } = require('express-validator');
const User = require('../models/User');
const { toggleStatus, toggleAvailability } = require('../controllers/userController');
const mongoose = require('mongoose');

const validateUserId = param('id').isMongoId().withMessage('Invalid user ID');
const validateRole = body('role').optional().isIn(['customer', 'provider', 'admin']).withMessage('Invalid role');
const validateProfile = body('profile').optional().custom((value) => {
  if (value) {
    if (value.skills && !Array.isArray(value.skills)) throw new Error('Skills must be an array');
    if (value.availability && typeof value.availability !== 'string') throw new Error('Availability must be a string');
    if (value.location && typeof value.location !== 'string') throw new Error('Location must be a string');
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
});

const validateSettings = [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('email').optional().isEmail().withMessage('Email must be a valid email address'),
];

router.get('/users', authMiddleware(['admin']), getUsers);

router.put('/users/:id/role', [
  authMiddleware(['admin']),
  validateUserId,
  validateRole,
  validateProfile,
], updateUserRole);

router.put('/users/:id', [
  authMiddleware(['admin']),
  validateUserId,
  validateProfile,
], updateUser);

router.delete('/users/:id', [
  authMiddleware(['admin']),
  validateUserId,
], deleteUser);

router.put('/users/:userId/toggle-status', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleStatus);

router.put('/users/:userId/toggle-availability', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleAvailability);

router.get('/logs', authMiddleware(['admin']), getLogs);

router.get('/messages', authMiddleware(['admin']), getMessages);

router.put('/messages/:id/read', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid message ID'),
], markMessageAsRead);

router.delete('/messages/:id', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid message ID'),
], deleteMessage);

router.post('/messages/:id/reply', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid message ID'),
], replyToMessage);

router.post('/messages/bulk-read', [
  authMiddleware(['admin']),
  body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
], bulkMarkAsRead);

router.post('/messages/bulk-delete', [
  authMiddleware(['admin']),
  body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
], bulkDelete);

router.put('/services/slots', authMiddleware(['admin']), updateServiceSlots);

router.delete('/logs/:id', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid log ID'),
], deleteLog);

router.post('/logs/bulk-delete', [
  authMiddleware(['admin']),
  body('logIds').isArray({ min: 1 }).withMessage('At least one log ID is required').custom((value) => {
    value.forEach(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid log ID in array');
    });
    return true;
  }),
  (req, res, next) => {
    console.log('Handling /logs/bulk-delete with body:', req.body);
    next();
  }
], deleteLogsBulk);

router.put('/settings', [
  authMiddleware(['admin']),
  ...validateSettings,
], updateSettings);

router.get('/providers/active', [
  authMiddleware(['admin', 'customer']),
  query('location').notEmpty().withMessage('Location is required'),
  query('services').optional().isString().withMessage('Services must be a string if provided'),
], getActiveProviders);

router.get('/providers/subscriptions', authMiddleware(['admin']), getProviderSubscriptions);

router.post('/providers/:providerId/cancel-subscription', [
  authMiddleware(['admin']),
  param('providerId').isMongoId().withMessage('Invalid provider ID'),
], cancelProviderSubscription);

router.post('/bookings/:bookingId/assign-provider', [
  authMiddleware(['admin']),
  param('bookingId').isMongoId().withMessage('Invalid booking ID'),
  body('providerId').isMongoId().withMessage('Invalid provider ID'),
], assignProvider);

module.exports = router;
