
const express = require('express');
const { createPlan, getPlans, updatePlan, deletePlan } = require('../controllers/planController.js');
const authMiddleware = require('../middleware/auth.js');

const router = express.Router();

// Route to get all plans and create a new plan
router.route('/')
  .get(authMiddleware(['admin', 'provider']), getPlans) // Allow providers to GET plans
  .post(authMiddleware(['admin']), createPlan);      // Admin-only for POST

// Route to update and delete a plan by ID
router.route('/:id')
  .put(authMiddleware(['admin']), updatePlan)       // Admin-only for PUT
  .delete(authMiddleware(['admin']), deletePlan);   // Admin-only for DELETE

module.exports = router;


















































/* // backend/routes/planRoutes.js

const express = require('express');
const { createPlan, getPlans } = require('../controllers/planController.js');
const authMiddleware = require('../middleware/auth.js');

const router = express.Router();

// Route to get all plans and create a new plan
router.route('/')
  .get(authMiddleware(['admin', 'provider']), getPlans) // Allow providers to GET plans
  .post(authMiddleware(['admin']), createPlan);      // Keep POST admin-only

module.exports = router; */