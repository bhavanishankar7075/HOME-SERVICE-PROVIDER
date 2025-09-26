const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createService,
  getServices,
  updateService,
  deleteService,
  bulkDeleteServices,
  getFeaturedServices,
  getServiceAvailability,
} = require('../controllers/serviceController');
const multer = require('multer');
const { storage } = require('../config/cloudinary'); // <-- 1. IMPORT Cloudinary storage

// <-- 2. REMOVED the old multer.diskStorage and fileFilter configuration

// 3. CONFIGURE multer to use the new Cloudinary storage engine -->
const upload = multer({
  storage: storage, // Use the imported Cloudinary storage
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 },
]);

// Middleware to parse multipart form data for non-file fields
router.use(express.urlencoded({ extended: true }));


// --- ROUTES ---
// (These all remain the same, they just use the new 'upload' middleware now)

router.get('/featured', getFeaturedServices);

router.get('/:serviceId/availability', getServiceAvailability);

router.get('/', getServices);

router.post('/', authMiddleware(['admin']), upload, createService);

router.put('/:id', authMiddleware(['admin']), upload, updateService);

router.delete('/:id', authMiddleware(['admin']), deleteService);

router.post('/bulk-delete', authMiddleware(['admin']), bulkDeleteServices);

module.exports = router;






























































//main
/* const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { 
  createService, 
  getServices, 
  updateService, 
  deleteService, 
  bulkDeleteServices,
  getFeaturedServices,      // <-- 1. IMPORTED new controller
  getServiceAvailability, // <-- 1. IMPORTED new controller
} = require('../controllers/serviceController');
const multer = require('multer');
const path = require('path');

// Multer storage and file filter configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/services/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 },
]);

// Middleware to parse multipart form data for non-file fields
router.use(express.urlencoded({ extended: true }));

// --- 2. ADDED THE NEW ROUTES ---

// GET featured services
// NOTE: This is placed before routes with an /:id parameter to avoid conflicts.
router.get('/featured', getFeaturedServices);

// GET available time slots for a specific service on a given date
router.get('/:serviceId/availability', getServiceAvailability);


// --- EXISTING ROUTES ---
router.get('/', getServices);
router.post('/', authMiddleware(['admin']), upload, createService);
router.put('/:id', authMiddleware(['admin']), upload, updateService);
router.delete('/:id', authMiddleware(['admin']), deleteService);
router.post('/bulk-delete', authMiddleware(['admin']), bulkDeleteServices);

module.exports = router; */














/* const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createService, getServices, updateService, deleteService, bulkDeleteServices } = require('../controllers/serviceController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/services/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 },
]);

router.get('/', authMiddleware(['admin','customer']), getServices);
router.post('/', authMiddleware(['admin']), upload, createService);
router.put('/:id', authMiddleware(['admin']), upload, updateService);
router.delete('/:id', authMiddleware(['admin']), deleteService);
router.post('/bulk-delete', authMiddleware(['admin']), bulkDeleteServices);

module.exports = router;  */











