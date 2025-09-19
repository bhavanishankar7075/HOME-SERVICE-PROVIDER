// cleanupOrphanedConversations.js
require('dotenv').config();
const mongoose = require('mongoose');

// Import and register models
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    // Add other fields as per your User model
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

const ConversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed', 'needs_attention'], default: 'open' },
}, { timestamps: true });
const Conversation = mongoose.model('Conversation', ConversationSchema);

const ChatingSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    sender: { type: String, enum: ['user', 'model'] },
    text: String,
}, { timestamps: true });
const Chating = mongoose.model('Chating', ChatingSchema);

async function cleanOrphanedConversations() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file or environment variables.');
        }

        await mongoose.connect(process.env.MONGO_URI, {
            // Remove deprecated options
        });
        console.log('Connected to MongoDB');

        const conversations = await Conversation.find({}).populate('userId');
        const orphaned = conversations.filter(convo => !convo.userId);

        for (const convo of orphaned) {
            console.log(`Deleting orphaned conversation ${convo._id}`);
            await Chating.deleteMany({ conversationId: convo._id });
            await Conversation.deleteOne({ _id: convo._id });
        }

        console.log(`Deleted ${orphaned.length} orphaned conversations`);
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

cleanOrphanedConversations().catch(console.error);