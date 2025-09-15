const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const authMiddleware = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        res.status(401);
        throw new Error('Not authorized, invalid token payload');
      }

      req.user = await User.findById(decoded.id).select('-password');
      console.log('Authenticated user:', req.user);
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized, invalid role');
      }

      if (req.headers['x-socket-id']) {
        const socket = global.io.sockets.sockets.get(req.headers['x-socket-id']);
        if (socket) {
          socket.join(req.user._id.toString());
        }
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  });
};

module.exports = authMiddleware;












/* const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const authMiddleware = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        res.status(401);
        throw new Error('Not authorized, invalid token payload');
      }

      req.user = await User.findById(decoded.id).select('-password');
      console.log('Authenticated user:', req.user);
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        res.status(403);
        throw new Error('Not authorized, invalid role');
      }

      if (req.headers['x-socket-id']) {
        const socket = global.io.sockets.sockets.get(req.headers['x-socket-id']);
        if (socket) {
          socket.join(req.user._id.toString());
        }
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  });
};

module.exports = authMiddleware; */











