const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
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
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const appointmentRoutes = require('./routes/appointments');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const faqRoutes = require('./routes/faq');
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
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/faqs', faqRoutes);
// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found', requestedUrl: req.url });
});

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
    origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
      const Order = require('./models/Order');
      const Service = require('./models/Service');
      const Feedback = require('./models/Feedback');
      const Appointment = require('./models/Appointment');
      
      const revenue = await Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]);
      socket.emit('revenueUpdated', { total: revenue[0]?.total || 0 });

      const [orderCount, serviceCount, feedbackCount, paymentCount, appointmentCount] = await Promise.all([
        Order.countDocuments(),
        Service.countDocuments(),
        Feedback.countDocuments(),
        Booking.countDocuments({ 'paymentDetails.status': 'completed' }),
        Appointment.countDocuments(),
      ]);
      socket.emit('ordersUpdated', { count: orderCount });
      socket.emit('servicesUpdated', { count: serviceCount });
      socket.emit('feedbacksUpdated', { count: feedbackCount });
      socket.emit('paymentsUpdated', { count: paymentCount });
      socket.emit('appointmentsUpdated', { count: appointmentCount });

      const appointments = await Appointment.find().lean();
      socket.emit('appointmentUpdated', appointments);
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
  socket.on('newAppointment', (data) => { if (data.appointment) { socket.to(data.appointment.providerId.toString()).emit('newAppointment', data.appointment); io.to('admin_room').emit('newAdminNotification', { message: `New appointment scheduled with ${data.appointment.providerId}` }); } });
  socket.on('appointmentDeleted', (data) => { if (data.appointmentId) { socket.to(data.appointment.providerId.toString()).emit('appointmentDeleted', data); } });
  socket.on('accountDeleted', (data) => { console.log('Account deleted event:', data.message); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`));













































/* 
 const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// FIX: Load environment variables at the very beginning
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/user');
const feedbackRoutes = require('./routes/feedback');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const serviceRoutes = require('./routes/services');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const appointmentRoutes = require('./routes/appointments');
const { simulateLocationUpdate } = require('./controllers/bookingController');
const { handleStripeWebhook } = require('./controllers/paymentController');

// Log environment variables to confirm they are loaded
console.log('--- Environment Variables Status ---');
console.log({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Defined' : '!!! UNDEFINED !!!',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Defined' : '!!! UNDEFINED !!!',
  JWT_SECRET: process.env.JWT_SECRET ? 'Defined' : '!!! UNDEFINED !!!',
  PORT: process.env.PORT || '!!! UNDEFINED !!!',
  MONGO_URI: process.env.MONGO_URI ? 'Defined' : '!!! UNDEFINED !!!',
});
console.log('------------------------------------');

// Ensure database connection before proceeding
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/bookings', bookingRoutes);

// Catch-all for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found', requestedUrl: req.url });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`Error: ${err.message}`);
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
      const Order = require('./models/Order');
      const Service = require('./models/Service');
      const Feedback = require('./models/Feedback');
      const Appointment = require('./models/Appointment');
      
      const revenue = await Booking.aggregate([
        { $match: { status: 'completed' } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceData' } },
        { $unwind: '$serviceData' },
        { $group: { _id: null, total: { $sum: '$serviceData.price' } } },
      ]);
      socket.emit('revenueUpdated', { total: revenue[0]?.total || 0 });

      const [orderCount, serviceCount, feedbackCount, paymentCount, appointmentCount] = await Promise.all([
        Order.countDocuments(),
        Service.countDocuments(),
        Feedback.countDocuments(),
        Booking.countDocuments({ 'paymentDetails.status': 'completed' }),
        Appointment.countDocuments(),
      ]);
      socket.emit('ordersUpdated', { count: orderCount });
      socket.emit('servicesUpdated', { count: serviceCount });
      socket.emit('feedbacksUpdated', { count: feedbackCount });
      socket.emit('paymentsUpdated', { count: paymentCount });
      socket.emit('appointmentsUpdated', { count: appointmentCount });

      const appointments = await Appointment.find().lean();
      socket.emit('appointmentUpdated', appointments);
    } catch (error) {
      console.error(`Error emitting initial data:`, error.message);
    }
  };
  emitInitialData();

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
  
  socket.on('newAppointment', (data) => { if (data.appointment) { socket.to(data.appointment.providerId.toString()).emit('newAppointment', data.appointment); io.to('admin_room').emit('newAdminNotification', { message: `New appointment scheduled with ${data.appointment.providerId}` }); } });
  
  socket.on('appointmentDeleted', (data) => { if (data.appointmentId) { socket.to(data.appointment.providerId.toString()).emit('appointmentDeleted', data); } });
  
  socket.on('accountDeleted', (data) => { console.log('Account deleted event:', data.message); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`));
 */ 





















/* const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/user');
const feedbackRoutes = require('./routes/feedback');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const serviceRoutes = require('./routes/services');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const appointmentRoutes = require('./routes/appointments');
const { simulateLocationUpdate } = require('./controllers/bookingController');
const path = require('path');
// NEW: Import the specific controller function for the webhook
const { handleStripeWebhook } = require('./controllers/paymentController');

// Load environment variables
const envResult = dotenv.config();
if (envResult.error) {
  console.error('Error loading .env file:', envResult.error.message);
  process.exit(1);
} else {
  console.log('Environment variables loaded:', {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Defined' : 'Undefined',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Defined' : 'Undefined', // Important for webhook
    JWT_SECRET: process.env.JWT_SECRET ? 'Defined' : 'Undefined',
    PORT: process.env.PORT || 'Undefined',
    MONGO_URI: process.env.MONGO_URI ? 'Defined' : 'Undefined',
  });
}

// Ensure database connection before proceeding
connectDB().then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming ${req.method} request to ${req.url}`);
  next();
});
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// NEW: Stripe webhook route must be before express.json() to get the raw body
app.post('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// This will parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Route mounting
console.log('Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/bookings', bookingRoutes);
console.log('Routes mounted successfully');

// Catch-all for undefined routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 404: No route found for ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found', requestedUrl: req.url });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? 'Hidden' : err.stack,
    path: req.url,
    method: req.method,
  });
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:5000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Make io instance globally available
global.io = io; 
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected:`, socket.id);

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
      const Order = require('./models/Order');
      const Service = require('./models/Service');
      const Feedback = require('./models/Feedback');
      const Appointment = require('./models/Appointment');
      const revenue = await Booking.aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceData' },
        },
        { $unwind: '$serviceData' },
        { $group: { _id: null, total: { $sum: '$serviceData.price' } } },
      ]).catch(err => { throw new Error(`Aggregation error: ${err.message}`); });
      socket.emit('revenueUpdated', { total: revenue[0]?.total || 0 });
      const [orderCount, serviceCount, feedbackCount, paymentCount, appointmentCount] = await Promise.all([
        Order.countDocuments().catch(err => { throw new Error(`Order count error: ${err.message}`); }),
        Service.countDocuments().catch(err => { throw new Error(`Service count error: ${err.message}`); }),
        Feedback.countDocuments().catch(err => { throw new Error(`Feedback count error: ${err.message}`); }),
        Payment.countDocuments().catch(err => { throw new Error(`Payment count error: ${err.message}`); }),
        Appointment.countDocuments().catch(err => { throw new Error(`Appointment count error: ${err.message}`); }),
      ]);
      socket.emit('ordersUpdated', { count: orderCount });
      socket.emit('servicesUpdated', { count: serviceCount });
      socket.emit('feedbacksUpdated', { count: feedbackCount });
      socket.emit('paymentsUpdated', { count: paymentCount });
      socket.emit('appointmentsUpdated', { count: appointmentCount });
      const appointments = await Appointment.find().lean();
      socket.emit('appointmentUpdated', appointments);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error emitting initial data:`, error.message);
    }
  };
  emitInitialData();
  socket.on('disconnect', () => console.log(`[${new Date().toISOString()}] User disconnected`));
  socket.on('logout', (data) => { console.log(`[${new Date().toISOString()}] Logout event:`, data.userId); });
  socket.on('newBooking', (data) => {
    if (data.bookingId && data.providerId) {
      simulateLocationUpdate(data.bookingId, data.providerId).catch(err =>
        console.error(`[${new Date().toISOString()}] Error in simulateLocationUpdate:`, err.message)
      );
      io.to('admin_room').emit('newAdminNotification', { message: `New booking created for provider ${data.providerId}` });
    } else {
      console.error(`[${new Date().toISOString()}] Invalid newBooking data:`, data);
    }
  });
  socket.on('userUpdated', (data) => { if (data.userId) { socket.to(data.userId.toString()).emit('userUpdated', data.profile); } });
  socket.on('userDeleted', (data) => { if (data.userId) { socket.to(data.userId.toString()).emit('userDeleted', data); } });
  socket.on('newAppointment', (data) => { if (data.appointment) { socket.to(data.appointment.providerId.toString()).emit('newAppointment', data.appointment); io.to('admin_room').emit('newAdminNotification', { message: `New appointment scheduled with ${data.appointment.providerId}` }); } });
  socket.on('appointmentDeleted', (data) => { if (data.appointmentId) { socket.to(data.appointment.providerId.toString()).emit('appointmentDeleted', data); } });
  socket.on('accountDeleted', (data) => { console.log(`[${new Date().toISOString()}] Account deleted event:`, data.message); });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[${new Date().toISOString()}] Server running on port ${PORT} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`)); */