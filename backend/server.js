const express = require('express');
const compression = require('compression');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/user');
const feedbackRoutes = require('./routes/feedback');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const serviceRoutes = require('./routes/services');
const dashboardRoutes = require('./routes/dashboard');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const faqRoutes = require('./routes/faq');
const chatingRoutes = require('./routes/chatingRoutes');
const planRoutes = require('./routes/planRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { simulateLocationUpdate } = require('./controllers/bookingController');
const { handleStripeWebhook } = require('./controllers/paymentController');

// Log environment variables
console.log('--- Environment Variables Status ---');
console.log({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Defined' : '!!! UNDEFINED !!!',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Defined' : '!!! UNDEFINED !!!',
  JWT_SECRET: process.env.JWT_SECRET ? 'Defined' : '!!! UNDEFINED !!!',
  PORT: process.env.PORT || '!!! UNDEFINED !!!',
  MONGO_URI: process.env.MONGO_URI ? 'Defined' : '!!! UNDEFINED !!!',
});
console.log('------------------------------------');

// Connect to database
connectDB();

const app = express();
app.use(compression());
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 
    'http://localhost:5173', 
    'http://localhost:5000',
    'https://home-service-provider-backend.onrender.com',
    'https://home-service-provider-frontend.onrender.com',
    'https://home-service-provider-admin.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// This ensures we receive the webhook payload as a raw buffer for signature verification.
app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// This middleware parses JSON for all OTHER routes
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

/* app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 */
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/chat', chatingRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/', (req, res) => {
  res.json({ 
    status: 'API is running', 
    message: 'Welcome to the Home-Service-Provider API!' 
  });
});

// Catch-all for undefined routes
/* app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found', requestedUrl: req.url });
}); */

// Error handling
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`Error: ${err.message}`);
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5174', 
      'http://localhost:5173', 
      'http://localhost:5000',
      'https://home-service-provider-backend.onrender.com',
      'https://home-service-provider-frontend.onrender.com',
      'https://home-service-provider-admin.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

global.io = io;
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User with ID: ${userId} joined their private room.`);
  });
  
  socket.on('joinAdminRoom', () => {
    socket.join('admin_room');
    console.log(`Socket ${socket.id} joined the admin room.`);
  });

  const emitInitialData = async () => {
    try {
      const Booking = require('./models/Booking');
      const Service = require('./models/Service');
      const Feedback = require('./models/Feedback');
      
      const revenue = await Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]);
      socket.emit('revenueUpdated', { total: revenue[0]?.total || 0 });

      const [ serviceCount, feedbackCount, paymentCount ] = await Promise.all([
        Service.countDocuments(),
        Feedback.countDocuments(),
        Booking.countDocuments({ 'paymentDetails.status': 'completed' }),
      ]);
      socket.emit('servicesUpdated', { count: serviceCount });
      socket.emit('feedbacksUpdated', { count: feedbackCount });
      socket.emit('paymentsUpdated', { count: paymentCount });

    } catch (error) {
      console.error(`Error emitting initial data:`, error.message);
    }
  };
  emitInitialData();

  socket.on('feedbackSubmitted', (data) => {
    console.log(`Feedback submitted for provider ${data.feedback.providerId}:`, data);
  });
  socket.on('feedbackUpdated', (data) => {
    console.log(`Feedback updated for provider ${data.providerId}:`, data);
  });
  socket.on('feedbackDeleted', (data) => {
    console.log(`Feedback deleted:`, data);
  });

  socket.on('disconnect', () => console.log('User disconnected'));
  socket.on('logout', (data) => console.log('Logout event:', data.userId));
  socket.on('newBooking', (data) => {
    if (data.bookingId && data.providerId) {
      simulateLocationUpdate(data.bookingId, data.providerId).catch(err =>
        console.error(`Error in simulateLocationUpdate:`, err.message)
      );
      io.to('admin_room').emit('newAdminNotification', { message: `New booking created for provider ${data.providerId}` });
    } else {
      console.error(`Invalid newBooking data:`, data);
    }
  });
  socket.on('userUpdated', (data) => { if (data.userId) { socket.to(data.userId.toString()).emit('userUpdated', data.profile); } });
  socket.on('userDeleted', (data) => { if (data.userId) { socket.to(data.userId.toString()).emit('userDeleted', data); } });
  socket.on('accountDeleted', (data) => { console.log('Account deleted event:', data.message); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`));
