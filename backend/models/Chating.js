// backend/models/Chating.js
const mongoose = require('mongoose');

const chatingSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'model'], // 'model' refers to the AI
  },
  text: {
    type: String,
    required: true,
  },
}, { timestamps: true });

chatingSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Chating', chatingSchema);