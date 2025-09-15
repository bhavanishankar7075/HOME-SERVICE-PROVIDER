const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Home Maintenance', 'Plumbing', 'Cleaning', 'Electrical', 'Painting', 'Carpentry', 'Landscaping'] 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, default: '' },
  additionalImages: { type: [String], default: [] },
  offer: { type: String, default: '' },
  deal: { type: String, default: '' },
  availableSlots: { 
    type: Map, 
    of: [String],
    default: () => new Map(),
  },
  averageRating: { type: Number, default: 0 },
  feedbackCount: { type: Number, default: 0 },
}, { timestamps: true });

// Add index for provider queries
serviceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Service', serviceSchema);


















/* const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['Home Maintenance', 'Plumbing', 'Cleaning', 'Electrical', 'Painting', 'Carpentry', 'Landscaping'] 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, default: '' },
  additionalImages: { type: [String], default: [] },
  offer: { type: String, default: '' },
  deal: { type: String, default: '' },
  // Scheduling-related field
  availableSlots: { 
    type: Map, 
    of: [String], // Map of dates to arrays of available times (e.g., "2025-09-06": ["09:00", "11:00"])
    default: () => new Map(), // Ensure default is a Map instance
  },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema); */