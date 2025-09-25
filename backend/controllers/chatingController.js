const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Chating = require('../models/Chating');
const Service = require('../models/Service');
const Feedback = require('../models/Feedback');
const mongoose = require('mongoose');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Cache for knowledge base
let knowledgeBaseCache = null;
const buildKnowledgeBase = async () => {
    if (knowledgeBaseCache) return knowledgeBaseCache;

    const services = await Service.find({});
    const recentFeedbacks = await Feedback.find({ approved: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('userId', 'name');

    let knowledgeBase = "You are 'ServiceHub Assistant', a friendly and helpful AI for Home Service Provider. Use ONLY the following information to answer user questions.\n\n";
    knowledgeBase += "=== AVAILABLE SERVICES ===\n";
    services.forEach(service => {
        knowledgeBase += `- Name: ${service.name}, Price: ₹${service.price}, Category: ${service.category}, Description: ${service.description}\n`;
    });

    if (recentFeedbacks.length > 0) {
        knowledgeBase += "\n=== RECENT CUSTOMER FEEDBACK ===\n";
        recentFeedbacks.forEach(fb => {
            knowledgeBase += `- A customer named ${fb.userId.name} gave a ${fb.rating}-star review, saying: "${fb.comment}"\n`;
        });
    }

    knowledgeBase += "\n=== COMPANY POLICIES ===\n- To book a service, the user must go to the 'Services' or 'Home' page, select a service, and click 'Book Now'.\n- If you don't know an answer from the information provided, politely say 'I'm not sure about that, but I can notify an admin to help you.' and stop.\n- Do not make up information.\n";

    knowledgeBaseCache = knowledgeBase;
    return knowledgeBase;
};

const invalidateKnowledgeBaseCache = () => {
    knowledgeBaseCache = null;
};

const getOrCreateConversation = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
        conversation = await Conversation.create({ userId });
    }
    const messages = await Chating.find({ conversationId: conversation._id }).sort({ createdAt: 'asc' });
    res.json({
        conversationId: conversation._id,
        status: conversation.status,
        adminActive: conversation.adminActive,
        messages: messages.map(msg => ({ sender: msg.sender, text: msg.text, createdAt: msg.createdAt }))
    });
});

const postMessage = asyncHandler(async (req, res) => {
    const { conversationId, text } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(conversationId) || !text) {
        res.status(400);
        throw new Error('Valid Conversation ID and text are required.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.userId.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('Invalid or unauthorized conversation.');
    }

    const userMessage = await Chating.create({ conversationId, sender: 'user', text });

    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('newMessage', {
            sender: userMessage.sender,
            text: userMessage.text,
            createdAt: userMessage.createdAt
        });
        global.io.to('admin_room').emit('newUserMessage', {
            conversationId,
            message: { sender: userMessage.sender, text: userMessage.text, createdAt: userMessage.createdAt }
        });
    }

    // Check if admin is active or user requests human assistance
    if (conversation.adminActive || text.toLowerCase().includes('talk to a human') || text.toLowerCase().includes('speak to an agent')) {
        conversation.adminActive = true;
        conversation.status = 'needs_attention';
        await conversation.populate('userId', 'name email');
        await conversation.save();

        const aiMessageText = conversation.adminActive
            ? "Your message has been sent to the admin. They will respond shortly."
            : "I've flagged this conversation for a human admin. They will join the chat shortly.";
        const aiMessage = await Chating.create({ conversationId, sender: 'model', text: aiMessageText });

        if (global.io) {
            global.io.to(userId.toString()).emit('newMessage', {
                sender: aiMessage.sender,
                text: aiMessage.text,
                createdAt: aiMessage.createdAt
            });
            global.io.to('admin_room').emit('chatNeedsAttention', conversation);
        }
        return res.status(201).json({
            sender: aiMessage.sender,
            text: aiMessage.text,
            createdAt: aiMessage.createdAt
        });
    }

    // Handle general queries with AI
    const knowledgeBase = await buildKnowledgeBase();
    const history = await Chating.find({ conversationId }).sort({ createdAt: 'asc' });

    const chatHistoryForAI = [
        { role: "user", parts: [{ text: knowledgeBase }] },
        { role: "model", parts: [{ text: "Yes, I am ServiceHub Assistant. How can I help you today?" }] },
        ...history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }))
    ];

    try {
        const chat = model.startChat({
            history: chatHistoryForAI,
            generationConfig: { maxOutputTokens: 200 },
        });

        const result = await chat.sendMessage(text);
        const aiResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
        const aiMessage = await Chating.create({ conversationId, sender: 'model', text: aiResponse });

        if (global.io) {
            global.io.to(userId.toString()).emit('newMessage', {
                sender: aiMessage.sender,
                text: aiMessage.text,
                createdAt: aiMessage.createdAt
            });
        }

        res.status(201).json({
            sender: aiMessage.sender,
            text: aiMessage.text,
            createdAt: aiMessage.createdAt
        });
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        const errorMessage = await Chating.create({
            conversationId,
            sender: 'model',
            text: "Sorry, the AI service is temporarily unavailable. Please try again later.",
            createdAt: new Date()
        });
        if (global.io) {
            global.io.to(userId.toString()).emit('newMessage', {
                sender: errorMessage.sender,
                text: errorMessage.text,
                createdAt: errorMessage.createdAt
            });
        }
        res.status(500).json({
            sender: errorMessage.sender,
            text: errorMessage.text,
            createdAt: errorMessage.createdAt
        });
    }
});

const getAllConversations = asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({})
        .populate('userId', 'name email')
        .sort({ updatedAt: -1 });

    const validConversations = conversations.filter(convo => {
        if (!convo.userId) {
            console.warn(`Conversation ${convo._id} has no valid userId`);
            return false;
        }
        return true;
    });

    if (validConversations.length < conversations.length) {
        console.warn(`${conversations.length - validConversations.length} conversations excluded due to missing user data`);
    }

    res.json(validConversations);
});

const getMessagesByConversationId = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400);
        throw new Error('Invalid Conversation ID.');
    }
    const messages = await Chating.find({ conversationId }).sort({ createdAt: 'asc' });
    res.json(messages.map(msg => ({ sender: msg.sender, text: msg.text, createdAt: msg.createdAt })));
});

const adminSendMessage = asyncHandler(async (req, res) => {
    const { conversationId, text } = req.body;

    if (!mongoose.isValidObjectId(conversationId) || !text) {
        res.status(400);
        throw new Error('Valid Conversation ID and text are required.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found.');
    }

    conversation.adminActive = true;
    conversation.status = 'open';
    await conversation.save();

    const message = await Chating.create({
        conversationId,
        sender: 'model',
        text: `Admin: ${text}`,
        createdAt: new Date()
    });

    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('newMessage', {
            sender: message.sender,
            text: message.text,
            createdAt: message.createdAt
        });
        global.io.to('admin_room').emit('adminMessageSent', { conversationId, message });
    }

    res.status(201).json({
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt
    });
});

const closeConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.body;

    if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400);
        throw new Error('Invalid Conversation ID.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found.');
    }

    conversation.status = 'closed';
    conversation.adminActive = false;
    await conversation.save();

    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('conversationClosed', { conversationId });
        global.io.to('admin_room').emit('conversationClosed', { conversationId });
    }

    res.status(200).json({ message: 'Conversation closed successfully.' });
});

const reopenConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.body;

    if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400);
        throw new Error('Invalid Conversation ID.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found.');
    }

    conversation.status = 'open';
    conversation.adminActive = true;
    await conversation.save();

    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('conversationReopened', { conversationId });
        global.io.to('admin_room').emit('conversationReopened', { conversationId });
    }

    res.status(200).json({ message: 'Conversation reopened successfully.' });
});

const deleteConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.body;

    if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400);
        throw new Error('Invalid Conversation ID.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found.');
    }

    await Chating.deleteMany({ conversationId });
    await Conversation.deleteOne({ _id: conversationId });

    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('conversationDeleted', { conversationId });
        global.io.to('admin_room').emit('conversationDeleted', { conversationId });
    }

    res.status(200).json({ message: 'Conversation deleted successfully.' });
});





const clearChatHistory = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
        res.status(400);
        throw new Error('Invalid Conversation ID.');
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        res.status(404);
        throw new Error('Conversation not found.');
    }

    // Delete all Chating documents associated with this conversation
    await Chating.deleteMany({ conversationId });

    // Emit a socket event to inform clients in real-time
    if (global.io) {
        global.io.to(conversation.userId.toString()).emit('chatCleared', { conversationId });
        global.io.to('admin_room').emit('chatCleared', { conversationId });
    }

    res.status(200).json({ message: 'Chat history cleared successfully.' });
});

module.exports = {
    getOrCreateConversation,
    postMessage,
    getAllConversations,
    getMessagesByConversationId,
    adminSendMessage,
    closeConversation,
    reopenConversation,
    deleteConversation,
     clearChatHistory
};






































//main
/* const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Chating = require('../models/Chating');
const Service = require('../models/Service');
const Feedback = require('../models/Feedback');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Use correct model name
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const getOrCreateConversation = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
        conversation = await Conversation.create({ userId });
    }
    const messages = await Chating.find({ conversationId: conversation._id }).sort({ createdAt: 'asc' });
    res.json({
        conversationId: conversation._id,
        messages: messages.map(msg => ({ sender: msg.sender, text: msg.text }))
    });
});

const postMessage = asyncHandler(async (req, res) => {
    const { conversationId, text } = req.body;
    const userId = req.user._id;

    if (!conversationId || !text) {
        res.status(400);
        throw new Error('Conversation ID and text are required.');
    }

    await Chating.create({ conversationId, sender: 'user', text });

    const services = await Service.find({});
    const recentFeedbacks = await Feedback.find({ approved: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('userId', 'name');

    let knowledgeBase = "You are 'ServiceHub Assistant', a friendly and helpful AI. Use ONLY the following information to answer user questions.\n\n";
    knowledgeBase += "=== AVAILABLE SERVICES ===\n";
    services.forEach(service => {
        knowledgeBase += `- Name: ${service.name}, Price: ₹${service.price}, Category: ${service.category}, Description: ${service.description}\n`;
    });

    if (recentFeedbacks.length > 0) {
        knowledgeBase += "\n=== RECENT CUSTOMER FEEDBACK ===\n";
        recentFeedbacks.forEach(fb => {
            knowledgeBase += `- A customer named ${fb.userId.name} gave a ${fb.rating}-star review, saying: "${fb.comment}"\n`;
        });
    }

    knowledgeBase += "\n=== COMPANY POLICIES ===\n- To book a service, the user must go to the 'Services' or 'Home' page, select a service, and click 'Book Now'.\n- If you don't know an answer from the information provided, politely say 'I'm not sure about that, but I can notify an admin to help you.' and stop.\n- Do not make up information.\n";

    const history = await Chating.find({ conversationId }).sort({ createdAt: 'asc' });

    const chatHistoryForAI = [
        { role: "user", parts: [{ text: knowledgeBase }] },
        { role: "model", parts: [{ text: "Yes, I am ServiceHub Assistant. How can I help you today?" }] },
        ...history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }))
    ];

    try {
        const chat = model.startChat({
            history: chatHistoryForAI,
            generationConfig: { maxOutputTokens: 200 },
        });

        const result = await chat.sendMessage(text);

        // ✅ New SDK response format
        const aiResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

        const aiMessage = await Chating.create({ conversationId, sender: 'model', text: aiResponse });

        if (global.io) {
            global.io.to(userId.toString()).emit('newMessage', {
                sender: aiMessage.sender,
                text: aiMessage.text,
            });
        }

        res.status(201).json({
            sender: aiMessage.sender,
            text: aiMessage.text,
        });

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ error: "AI service is temporarily unavailable. Please try again later." });
    }
});

module.exports = { getOrCreateConversation, postMessage }; */









