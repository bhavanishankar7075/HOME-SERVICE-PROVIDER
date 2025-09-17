const asyncHandler = require('express-async-handler');
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

module.exports = { getOrCreateConversation, postMessage };































/* const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const Chating = require('../models/Chating');
const Service = require('../models/Service');
const Feedback = require('../models/Feedback');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

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
    const recentFeedbacks = await Feedback.find({ approved: true }).sort({ createdAt: -1 }).limit(3).populate('userId', 'name');

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

    const chat = model.startChat({
        history: chatHistoryForAI,
        generationConfig: {
            maxOutputTokens: 200,
        },
    });

    const result = await chat.sendMessage(text);
    const aiResponse = result.response.text();
    
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
});

module.exports = { getOrCreateConversation, postMessage }; */