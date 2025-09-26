const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['Pro', 'Elite'],
  },
  stripeProductId: {
    type: String,
    required: false,
  },
  stripePriceId: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'inr',
  },
  features: [
    {
      type: String,
      required: true,
    }
  ],

  // --- NEW FIELD START ---
  // This field defines the number of bookings a provider on this plan can accept per month.
  // A value of 0 will mean 'unlimited'.
  bookingLimit: {
    type: Number,
    required: true,
    default: 5, // Default limit for new plans, can be changed by admin.
  },
  // --- NEW FIELD END ---

}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
