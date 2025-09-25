const express = require('express');
const { 
  createSubscriptionSession, 
  createCustomerPortalSession,
  verifySubscriptionSession // <-- Import new function
} = require('../controllers/subscriptionController.js');
const authMiddleware = require('../middleware/auth.js');

const router = express.Router();
router.use(express.json());

router.post('/create-checkout-session', authMiddleware(['provider']), createSubscriptionSession);
router.post('/create-portal-session', authMiddleware(['provider']), createCustomerPortalSession);

// --- NEW ROUTE FOR VERIFICATION ---
router.post('/verify-session', authMiddleware(['provider']), verifySubscriptionSession);

module.exports = router;