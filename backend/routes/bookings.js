const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createBooking,
  assignProvider,
  findAvailableProviders, // NEW: Import the new function
  getServices,
  getMyBookings,
  updateBookingStatus,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getCustomerPreviousServices,
  getProviderPreviousWorks,
  trackService,
} = require('../controllers/bookingController');

// Routes (relative paths)
router.post('/', authMiddleware, createBooking);
router.get('/services', getServices);
router.get('/my-bookings', authMiddleware(), getMyBookings);
router.get('/previous-services', authMiddleware(['customer']), getCustomerPreviousServices);
router.get('/previous-works', authMiddleware(['provider']), getProviderPreviousWorks);
router.get('/all-bookings', authMiddleware(['admin']), getAllBookings);
router.get('/:id', authMiddleware(), getBookingById);
router.put('/:id', authMiddleware(), updateBooking);
router.delete('/:id', authMiddleware(), deleteBooking);
router.put('/:id/status', authMiddleware(), updateBookingStatus);
router.put('/:id/accept', authMiddleware(), acceptBooking);
router.put('/:id/reject', authMiddleware(), rejectBooking);
router.delete('/:id/cancel', authMiddleware(), cancelBooking);
router.get('/track/:trackingId', authMiddleware(), trackService);
router.put('/:bookingId/assign-provider', authMiddleware(['admin']), assignProvider);

// NEW: Route for an admin to find suitable providers for a booking
router.get('/:bookingId/find-providers', authMiddleware(['admin']), findAvailableProviders);

module.exports = router;