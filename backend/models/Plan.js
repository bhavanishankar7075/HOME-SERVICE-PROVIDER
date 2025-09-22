
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
    required: false, // Optional for backward compatibility
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
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);





















































/* const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['Pro', 'Elite'], // You can expand this later
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
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema); */