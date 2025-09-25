const express = require('express');
const { validateContact, submitContact, verifyAdmin, getContacts, markResponded } = require('../controllers/contactController');

const router = express.Router();

// POST /api/contact - Handle contact form submission (public)
router.post('/', validateContact, submitContact);

// GET /api/contact - Fetch all contact messages (admin only)
router.get('/', verifyAdmin, getContacts);

// PUT /api/contact/:id/responded - Mark a message as responded (admin only)
router.put('/:id/responded', verifyAdmin, markResponded);

module.exports = router;