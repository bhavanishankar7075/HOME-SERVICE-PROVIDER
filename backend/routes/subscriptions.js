const express = require('express');
const router = express.Router();
const { 
  createSubscription, 
  getMySubscription, 
  getAllSubscriptions, 
  updateSubscription, 
  deleteSubscription, 
  getProviderRevenue 
} = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');

console.log('[subscriptions.js] Imported handlers:', {
  createSubscription: typeof createSubscription,
  getMySubscription: typeof getMySubscription,
  getAllSubscriptions: typeof getAllSubscriptions,
  updateSubscription: typeof updateSubscription,
  deleteSubscription: typeof deleteSubscription,
  getProviderRevenue: typeof getProviderRevenue,
  authMiddleware: typeof authMiddleware
});

router.post('/', authMiddleware, createSubscription);
router.get('/my-subscription', authMiddleware, getMySubscription);
router.get('/', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  next();
}, getAllSubscriptions);
router.put('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  next();
}, updateSubscription);
router.delete('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  next();
}, deleteSubscription);
router.get('/revenue/:providerId', authMiddleware, getProviderRevenue);

module.exports = router;