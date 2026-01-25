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
  isAvailable: {                 // ✅ NEW
    type: Boolean,
    default: true,
  },
  availableSlots: { 
    type: Map, 
    of: [String],
    default: () => new Map(),
  },
  averageRating: { type: Number, default: 0 },
  feedbackCount: { type: Number, default: 0 },
}, { timestamps: true });

serviceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Service', serviceSchema);
