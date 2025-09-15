const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  scheduledTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

appointmentSchema.post('save', function (doc, next) {
  if (global.io) {
    const appointmentData = doc.toObject();
    global.io.emit('appointmentUpdated', appointmentData);
    global.io.emit('appointmentsUpdated', { count: mongoose.models.Appointment.countDocuments() });
  }
  next();
});

appointmentSchema.post('findOneAndUpdate', function (doc, next) {
  if (global.io && doc) {
    const appointmentData = doc.toObject();
    global.io.emit('appointmentUpdated', appointmentData);
  }
  next();
});

appointmentSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.emit('appointmentDeleted', { _id: doc._id });
    global.io.emit('appointmentsUpdated', { count: mongoose.models.Appointment.countDocuments() });
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);