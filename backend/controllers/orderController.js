const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Service = require('../models/Service');
const Joi = require('joi');

// Validation schema
const orderSchema = Joi.object({
  serviceId: Joi.string().required().messages({
    'string.empty': 'Service ID is required',
    'any.required': 'Service ID is required',
  }),
  status: Joi.string().valid('pending', 'processing', 'completed', 'cancelled').optional(),
});

// Create Order
const createOrder = asyncHandler(async (req, res) => {
  const { error } = orderSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { serviceId, status } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  const order = await Order.create({
    userId: req.user._id,
    serviceId,
    status: status || 'pending',
  });

  const orderCount = await Order.countDocuments();
  if (global.io) {
    global.io.emit('ordersUpdated', { count: orderCount });
  }

  res.status(201).json(order);
});

// Update Order
const updateOrder = asyncHandler(async (req, res) => {
  const { error } = orderSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { status, serviceId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  if (serviceId) {
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }
    order.serviceId = serviceId;
  }
  if (status) order.status = status;

  await order.save();

  const orderCount = await Order.countDocuments();
  if (global.io) {
    global.io.emit('ordersUpdated', { count: orderCount });
  }

  res.json(order);
});

// Delete Order
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this order');
  }

  await Order.findByIdAndDelete(req.params.id);
  const orderCount = await Order.countDocuments();
  if (global.io) {
    global.io.emit('ordersUpdated', { count: orderCount });
  }

  res.json({ message: 'Order deleted' });
});

// Get All Orders (Admin Only)
const getAllOrders = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only admins can view all orders');
  }
  const orders = await Order.find().populate('userId', 'name').populate('serviceId', 'name price');
  res.json(orders);
});

// Get User's Orders
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).populate('userId', 'name').populate('serviceId', 'name price');
  res.json(orders);
});

module.exports = { createOrder, updateOrder, deleteOrder, getAllOrders, getUserOrders };