const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planType: { type: String, enum: ['basic', 'premium'], default: 'basic' },
  revenuePercentage: { type: Number, default: 0.1, min: 0, max: 1 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  totalRevenue: { type: Number, default: 0, min: 0 },
  subscriptionFee: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentDetails: { 
    type: Object, 
    default: {}, 
    validate: {
      validator: (v) => typeof v === 'object' && v !== null,
      message: 'paymentDetails must be a valid object'
    }
  }
}, { timestamps: true });

subscriptionSchema.post('save', function(doc, next) {
  if (global.io) {
    global.io.to(doc.provider.toString()).to('admin_room').emit('subscriptionCreated', {
      subscription: doc,
      providerId: doc.provider.toString(),
      message: `New subscription created for provider ${doc.provider}`
    });
  }
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);