const express = require('express');
const router = express.Router();
const { subscribeToNewsletter } = require('../controllers/newsletterController');

router.post('/', subscribeToNewsletter); // Changed to match frontend

console.log('Newsletter route loaded: POST /');

module.exports = router;