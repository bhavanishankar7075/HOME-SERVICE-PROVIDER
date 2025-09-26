const mongoose = require('mongoose');

const chatingSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: String,
        enum: ['user', 'model'],
        required: true
    },
    text: {
        type: String,
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Chating', chatingSchema);
