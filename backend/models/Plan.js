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
  bookingLimit: {
    type: Number,
    required: true,
    default: 5, // Default limit for new plans, can be changed by admin.
  },

}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
