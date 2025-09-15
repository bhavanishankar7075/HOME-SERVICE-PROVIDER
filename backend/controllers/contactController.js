const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Contact = require('../models/Contact');

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Validation middleware for contact form
const validateContact = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
];

// Handle contact form submission
const submitContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, email, message } = req.body;

  try {
    const contact = new Contact({ name, email, message });
    await contact.save();

    global.io.to('admin_room').emit('newContactMessage', {
      id: contact._id,
      name,
      email,
      message,
      createdAt: contact.createdAt,
    });

    res.status(201).json({ message: 'Inquiry submitted successfully' });
  } catch (error) {
    console.error('Error processing contact form:', error.message);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// Fetch all contact messages (admin only)
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contact messages:', error.message);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// Mark a contact message as responded (admin only)
const markResponded = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    contact.responded = true;
    await contact.save();
    res.status(200).json({ message: 'Message marked as responded' });
  } catch (error) {
    console.error('Error marking message as responded:', error.message);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

module.exports = { validateContact, submitContact, verifyAdmin, getContacts, markResponded };