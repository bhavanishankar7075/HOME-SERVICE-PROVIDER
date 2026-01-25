const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  scheduledTime: { type: Date, required: true },
  location: { type: String, required: true },
    coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
  },
  totalPrice: { type: Number, required: true },
  paymentDetails: {
    method: { type: String, enum: ['COD', 'Stripe'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    stripePaymentIntentId: { type: String },
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
  },
  feedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
















