const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  approved: { type: Boolean, default: false },
}, { timestamps: true });

feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ bookingId: 1 });
feedbackSchema.index({ providerId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);