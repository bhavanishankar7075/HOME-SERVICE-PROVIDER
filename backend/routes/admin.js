const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    updateUserRole, 
    deleteUser, 
    updateUser, 
    getAppointments, 
    updateAppointment, 
    deleteAppointment,
    getMessages,
    markMessageAsRead,
    deleteMessage,
    replyToMessage,
    bulkMarkAsRead,
    bulkDelete,
    updateServiceSlots // <-- 1. IMPORTED the new controller
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { param, body, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { getLogs, deleteLog, deleteLogsBulk, } = require('../controllers/adminController');
const { updateSettings } = require('../controllers/adminController');
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

const validateAppointmentId = param('id').isMongoId().withMessage('Invalid appointment ID');
const validateStatus = body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status');
const validateScheduledTime = body('scheduledTime').optional().isISO8601().withMessage('Invalid date format');

// New validation for settings
const validateSettings = [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('email').optional().isEmail().withMessage('Email must be a valid email address'),
];

// Import toggle functions from userController
const { toggleStatus, toggleAvailability } = require('../controllers/userController');

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

router.get('/appointments', authMiddleware(['admin']), getAppointments);

router.put('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
  validateStatus,
  validateScheduledTime,
], updateAppointment);

router.delete('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
], deleteAppointment);

// Add toggle routes for admin control
router.put('/users/:userId/toggle-status', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleStatus);

router.put('/users/:userId/toggle-availability', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleAvailability);

// New route to fetch activity logs
router.get('/logs', authMiddleware(['admin']), getLogs);

// --- MESSAGE ROUTES ---
router.get(
    '/messages',
    authMiddleware(['admin']), 
    getMessages
);

router.put(
    '/messages/:id/read',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    markMessageAsRead
);

router.delete(
    '/messages/:id',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    deleteMessage
);

router.post(
    '/messages/:id/reply',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    replyToMessage
);

router.post(
    '/messages/bulk-read',
    authMiddleware(['admin']),
    body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
    bulkMarkAsRead
);

router.post(
    '/messages/bulk-delete',
    authMiddleware(['admin']),
    body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
    bulkDelete
);
// --- END OF MESSAGE ROUTES ---

// --- NEW SERVICE SLOT MANAGEMENT ROUTE ---
router.put(
    '/services/slots',
    authMiddleware(['admin']),
    updateServiceSlots
);
// ------------------------------------

// New route to delete a single log
router.delete('/logs/:id', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid log ID'),
], deleteLog);

// New route for bulk deletion of logs (changed to /logs/bulk-delete)
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

// New route to update admin settings
router.put('/settings', [
  authMiddleware(['admin']),
  ...validateSettings,
], updateSettings);

// New route to get active providers by location and optional services
router.get('/providers/active', [
  authMiddleware(['admin', 'customer']), // Allow both admin and customer roles
  query('location').notEmpty().withMessage('Location is required'),
  query('services').optional().isString().withMessage('Services must be a string if provided'),
], require('../controllers/adminController').getActiveProviders);

module.exports = router;




















/* const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    updateUserRole, 
    deleteUser, 
    updateUser, 
    getAppointments, 
    updateAppointment, 
    deleteAppointment,
    getMessages,
    markMessageAsRead,
    deleteMessage,
    replyToMessage,     // <-- 1. IMPORTED new controller
    bulkMarkAsRead,     // <-- 1. IMPORTED new controller
    bulkDelete         // <-- 1. IMPORTED new controller
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { param, body, query } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { getLogs, deleteLog, deleteLogsBulk, } = require('../controllers/adminController');
const { updateSettings } = require('../controllers/adminController');
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

const validateAppointmentId = param('id').isMongoId().withMessage('Invalid appointment ID');
const validateStatus = body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status');
const validateScheduledTime = body('scheduledTime').optional().isISO8601().withMessage('Invalid date format');

// New validation for settings
const validateSettings = [
  body('name').optional().isString().withMessage('Name must be a string'),
  body('email').optional().isEmail().withMessage('Email must be a valid email address'),
];

// Import toggle functions from userController
const { toggleStatus, toggleAvailability } = require('../controllers/userController');

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

router.get('/appointments', authMiddleware(['admin']), getAppointments);

router.put('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
  validateStatus,
  validateScheduledTime,
], updateAppointment);

router.delete('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
], deleteAppointment);

// Add toggle routes for admin control
router.put('/users/:userId/toggle-status', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleStatus);

router.put('/users/:userId/toggle-availability', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleAvailability);

// New route to fetch activity logs
router.get('/logs', authMiddleware(['admin']), getLogs);


// --- MESSAGE ROUTES ---
router.get(
    '/messages',
    authMiddleware(['admin']), 
    getMessages
);

router.put(
    '/messages/:id/read',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    markMessageAsRead
);

router.delete(
    '/messages/:id',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    deleteMessage
);

// --- 2. ADDED THE NEW ROUTES FOR REPLY & BULK ACTIONS ---
router.post(
    '/messages/:id/reply',
    authMiddleware(['admin']),
    param('id').isMongoId().withMessage('Invalid message ID'),
    replyToMessage
);

router.post(
    '/messages/bulk-read',
    authMiddleware(['admin']),
    body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
    bulkMarkAsRead
);

router.post(
    '/messages/bulk-delete',
    authMiddleware(['admin']),
    body('messageIds').isArray({ min: 1 }).withMessage('An array of messageIds is required.'),
    bulkDelete
);
// --- END OF MESSAGE ROUTES ---


// New route to delete a single log
router.delete('/logs/:id', [
  authMiddleware(['admin']),
  param('id').isMongoId().withMessage('Invalid log ID'),
], deleteLog);

// New route for bulk deletion of logs (changed to /logs/bulk-delete)
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

// New route to update admin settings
router.put('/settings', [
  authMiddleware(['admin']),
  ...validateSettings,
], updateSettings);

// New route to get active providers by location and optional services
router.get('/providers/active', [
  authMiddleware(['admin', 'customer']), // Allow both admin and customer roles
  query('location').notEmpty().withMessage('Location is required'),
  query('services').optional().isString().withMessage('Services must be a string if provided'),
], require('../controllers/adminController').getActiveProviders);

module.exports = router; */








































/* const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, deleteUser, updateUser, getAppointments, updateAppointment, deleteAppointment } = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { param, body } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

const validateUserId = param('id').isMongoId().withMessage('Invalid user ID');
const validateRole = body('role').optional().isIn(['customer', 'provider', 'admin']).withMessage('Invalid role');
const validateProfile = body('profile').optional().custom((value) => {
  if (value) {
    if (value.skills && !Array.isArray(value.skills)) throw new Error('Skills must be an array');
    if (value.availability && typeof value.availability !== 'string') throw new Error('Availability must be a string');
    if (value.location && typeof value.location !== 'string') throw new Error('Location must be a string');
    if (value.image && typeof value.image !== 'string') throw new Error('Image must be a string');
  }
  return true;
});

const validateAppointmentId = param('id').isMongoId().withMessage('Invalid appointment ID');
const validateStatus = body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status');
const validateScheduledTime = body('scheduledTime').optional().isISO8601().withMessage('Invalid date format');

// Import toggle functions from userController
const { toggleStatus, toggleAvailability } = require('../controllers/userController');

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

router.get('/appointments', authMiddleware(['admin']), getAppointments);

router.put('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
  validateStatus,
  validateScheduledTime,
], updateAppointment);

router.delete('/appointments/:id', [
  authMiddleware(['admin']),
  validateAppointmentId,
], deleteAppointment);

// Add toggle routes for admin control
router.put('/users/:userId/toggle-status', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleStatus);

router.put('/users/:userId/toggle-availability', [
  authMiddleware(['admin']),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], toggleAvailability);

module.exports = router; */