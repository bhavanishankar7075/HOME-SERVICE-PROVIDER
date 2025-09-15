const asyncHandler = require('express-async-handler');
const Newsletter = require('../models/Newsletter'); // Fixed case

const subscribeToNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }

  const existingSubscription = await Newsletter.findOne({ email });

  if (existingSubscription) {
    res.status(400);
    throw new Error('This email is already subscribed.');
  }

  const subscription = await Newsletter.create({ email });

  // Emit Socket.IO event for admin notification
  if (global.io) {
    global.io.to('admin_room').emit('newNewsletterSubscription', {
      email,
      subscribedAt: subscription.subscribedAt,
    });
    console.log('Emitted newNewsletterSubscription:', email);
  }

  res.status(201).json({ message: 'Subscribed successfully' }); // Match frontend expectation
});

module.exports = {
  subscribeToNewsletter,
};