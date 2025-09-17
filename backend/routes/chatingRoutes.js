// backend/routes/chatingRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getOrCreateConversation, postMessage } = require('../controllers/chatingController');

// Get conversation history for a user
router.get('/', authMiddleware(), getOrCreateConversation);

// Send a new message
router.post('/', authMiddleware(), postMessage);

module.exports = router;