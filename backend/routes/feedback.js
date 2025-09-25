
 const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createFeedback, getFeedbacks, updateFeedback, deleteFeedback } = require('../controllers/feedbackController');

router.post('/', authMiddleware(), createFeedback); // Customer submits feedback
router.get('/', authMiddleware(['admin', 'customer']), getFeedbacks); // Admin or customer views feedback
router.put('/:id', authMiddleware(), updateFeedback); // Customer or admin updates
router.delete('/:id', authMiddleware(), deleteFeedback); // Customer or admin deletes

module.exports = router;  