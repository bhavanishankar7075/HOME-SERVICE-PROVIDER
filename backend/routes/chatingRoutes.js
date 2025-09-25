const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    getOrCreateConversation,
    postMessage,
    getAllConversations,
    getMessagesByConversationId,
    adminSendMessage,
    closeConversation,
    reopenConversation,
    deleteConversation,
    clearChatHistory
} = require('../controllers/chatingController');

router.get('/', authMiddleware(), getOrCreateConversation);
router.post('/', authMiddleware(), postMessage);

router.get('/admin/all', authMiddleware(['admin']), getAllConversations);
router.get('/admin/conversations/:conversationId', authMiddleware(['admin']), getMessagesByConversationId);
router.post('/admin/send', authMiddleware(['admin']), adminSendMessage);
router.post('/admin/close', authMiddleware(['admin']), closeConversation);
router.post('/admin/reopen', authMiddleware(['admin']), reopenConversation);
router.post('/admin/delete', authMiddleware(['admin']), deleteConversation);
// Add this line with your other admin routes
router.delete('/admin/clear/:conversationId', authMiddleware(['admin']), clearChatHistory);

module.exports = router;







































/* // backend/routes/chatingRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getOrCreateConversation, postMessage } = require('../controllers/chatingController');

// Get conversation history for a user
router.get('/', authMiddleware(), getOrCreateConversation);

// Send a new message
router.post('/', authMiddleware(), postMessage);

module.exports = router; */

















