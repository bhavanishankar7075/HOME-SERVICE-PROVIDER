const express = require('express');
const router = express.Router();
const { getFAQs } = require('../controllers/faqController');

router.get('/', getFAQs);

console.log('FAQ route loaded: GET /');

module.exports = router;