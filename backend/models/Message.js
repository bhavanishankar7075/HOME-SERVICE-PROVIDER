const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Reference to the customer who sent the message
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Reference to the provider the message is about
  },
  providerName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'], // <-- ADDED 'replied'
    default: 'new',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // --- ADDED THIS FIELD TO STORE THE REPLY ---
  adminReply: {
    text: { type: String, trim: true },
    repliedAt: { type: Date },
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;