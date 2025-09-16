const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Feedback = require('../models/Feedback');

router.get('/revenue', asyncHandler(async (req, res) => {
  const revenue = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'serviceData',
      },
    },
    { $unwind: '$serviceData' },
    { $group: { _id: null, total: { $sum: '$serviceData.price' } } },
  ]);
  res.json({ total: revenue[0]?.total || 0 });
}));

router.get('/orders/count', asyncHandler(async (req, res) => {
  const count = await Order.countDocuments();
  res.json({ count });
}));

router.get('/services/count', asyncHandler(async (req, res) => {
  const count = await Service.countDocuments();
  res.json({ count });
}));

router.get('/feedbacks/count', asyncHandler(async (req, res) => {
  const count = await Feedback.countDocuments();
  res.json({ count });
}));

router.get('/services/category-stats', asyncHandler(async (req, res) => {
  const stats = await Service.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $project: { _id: 0, category: '$_id', count: 1 } },
  ]);
  const categoryStats = stats.reduce((acc, { category, count }) => ({ ...acc, [category]: count }), {});
  res.json(categoryStats);
}));

router.get('/bookings/monthly-revenue', asyncHandler(async (req, res) => {
  const monthlyRevenue = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'serviceData',
      },
    },
    { $unwind: '$serviceData' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: '$serviceData.price' },
      },
    },
    { $project: { _id: 0, month: '$_id', total: 1 } },
  ]);
  const revenueMap = monthlyRevenue.reduce((acc, { month, total }) => ({ ...acc, [month]: total }), {});
  res.json(revenueMap);
}));

module.exports = router;