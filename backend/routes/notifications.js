const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { userId: null, type: { $in: ['status_pending', 'status_assigned', 'status_updated'] } }
      : { 
          $or: [
            { userId: req.user.userId },
            { userId: null }
          ],
          type: { $in: ['status_pending', 'status_assigned', 'status_updated'] }
        };
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      role: req.user?.role,
      query
    });
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { userId: null, read: false, type: { $in: ['status_pending', 'status_assigned', 'status_updated'] } }
      : { 
          $or: [
            { userId: req.user.userId },
            { userId: null }
          ],
          read: false,
          type: { $in: ['status_pending', 'status_assigned', 'status_updated'] }
        };
    
    const count = await Notification.countDocuments(query);
    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      role: req.user?.role,
      query
    });
    res.status(500).json({ message: 'Failed to fetch unread count', error: error.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? { _id: req.params.id, userId: null, type: { $in: ['status_pending', 'status_assigned', 'status_updated'] } }
      : { 
          _id: req.params.id, 
          $or: [{ userId: req.user.userId }, { userId: null }],
          type: { $in: ['status_pending', 'status_assigned', 'status_updated'] }
        };
    
    const notification = await Notification.findOne(query);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
    
    const count = await Notification.countDocuments(
      req.user.role === 'admin'
        ? { userId: null, read: false, type: { $in: ['status_pending', 'status_assigned', 'status_updated'] } }
        : { 
            $or: [{ userId: req.user.userId }, { userId: null }],
            read: false,
            type: { $in: ['status_pending', 'status_assigned', 'status_updated'] }
          }
    );
    const io = req.app.get('io');
    io.to(req.user.role === 'admin' ? 'admin_room' : `user_${req.user.userId}`).emit('unreadCountUpdated', count);
  } catch (error) {
    console.error('Error marking notification as read:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      role: req.user?.role,
      notificationId: req.params.id
    });
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

module.exports = router;