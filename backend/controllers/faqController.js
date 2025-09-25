const asyncHandler = require('express-async-handler');
const FAQ = require('../models/FAQ');

const getFAQs = asyncHandler(async (req, res) => {
  const { serviceId, search } = req.query;
  let query = {};

  if (serviceId) {
    query.serviceId = serviceId;
  }
  if (search) {
    query.$text = { $search: search };
  }

  const faqs = await FAQ.find(query).sort({ createdAt: -1 });
  res.status(200).json(faqs);
});

module.exports = { getFAQs };