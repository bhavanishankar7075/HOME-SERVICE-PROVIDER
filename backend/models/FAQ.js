const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  answer: {
    type: String,
    required: true,
    trim: true,
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

faqSchema.index({ question: 'text', answer: 'text' }); // Enable text search

module.exports = mongoose.model('FAQ', faqSchema);