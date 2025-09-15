const express = require('express');
const router = express.Router();
const { createOrder, updateOrder, deleteOrder, getAllOrders, getUserOrders } = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware(['customer', 'admin']), createOrder);
router.put('/:id', authMiddleware(['customer', 'admin']), updateOrder);
router.delete('/:id', authMiddleware(['customer', 'admin']), deleteOrder);
router.get('/', authMiddleware(['admin']), getAllOrders);
router.get('/my', authMiddleware(['customer']), getUserOrders);

module.exports = router;