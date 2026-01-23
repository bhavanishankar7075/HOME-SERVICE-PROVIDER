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
const { storage } = require('../config/cloudinary'); 


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
