const express = require('express');
const router = express.Router();
const { createAppointment, getAppointments, updateAppointmentStatus, getAppointmentById, deleteAppointment } = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware(['customer']), createAppointment);
router.get('/', authMiddleware(['provider']), getAppointments);
router.put('/status', authMiddleware(['provider']), updateAppointmentStatus);
router.get('/:id', authMiddleware(['provider', 'customer']), getAppointmentById);
router.delete('/:id', authMiddleware(['provider', 'customer']), deleteAppointment);

module.exports = router;