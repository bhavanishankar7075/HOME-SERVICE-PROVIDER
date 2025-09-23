const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1 },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true, default: 'customer' },

  // --- Subscription Fields ---
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'elite'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due'],
    default: 'active',
  },
  stripeCustomerId: {
    type: String,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
  },

  // --- NEW FIELDS for Booking Limit Enforcement ---
  currentBookingCount: {
    type: Number,
    default: 0,
  },
  subscriptionStartDate: {
    type: Date,
  },

  // --- Profile Fields ---
  profile: {
    skills: [{ type: String, default: [] }],
    availability: { type: String, default: 'Unavailable' },
    location: {
      fullAddress: { type: String, default: '' },
      details: {
        streetNumber: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        postalCode: { type: String, default: '' }
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
    },
    image: { type: String, default: '/images/default-user.png' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', default: [] }],
    bookedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: [] }],
  },

  // --- OTP Fields ---
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
}, { timestamps: true });

// Middleware to hash password and OTP before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      return next(err);
    }
  }
  if (this.isModified('otp') && this.otp) {
    try {
      this.otp = await bcrypt.hash(this.otp, 10);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// --- This single hook handles broadcasting updates for both save and findOneAndUpdate ---
userSchema.post(/^(save|findOneAndUpdate)$/, function(doc, next) {
  if (global.io && doc) {
    console.log(`[Socket Emit] Triggering 'userUpdated' for User ID: ${doc._id.toString()}`);
    const userData = doc.toObject();
    delete userData.password;
    global.io.to(doc._id.toString()).emit('userUpdated', userData);
  }
  next();
});

// Hook for when a new user is created, to update admin stats
userSchema.post('save', function (doc, next) {
  if (this.isNew) {
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Hook for when a user is deleted, to update admin stats
userSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.to(doc._id.toString()).emit('userDeleted', { _id: doc._id });
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to compare entered OTP with hashed OTP
userSchema.methods.matchOtp = async function (enteredOtp) {
  return await bcrypt.compare(enteredOtp, this.otp);
};

module.exports = mongoose.model('User', userSchema);








































































/* const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1 },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true, default: 'customer' },

  // --- Subscription Fields ---
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'elite'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due'],
    default: 'active',
  },
  stripeCustomerId: {
    type: String,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
  },

  // --- NEW FIELDS for Booking Limit Enforcement ---
  currentBookingCount: {
    type: Number,
    default: 0,
  },
  subscriptionStartDate: {
    type: Date,
  },

  // --- Profile Fields ---
  profile: {
    skills: [{ type: String, default: [] }],
    availability: { type: String, default: 'Unavailable' },
    location: {
      fullAddress: { type: String, default: '' },
      details: {
        streetNumber: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        postalCode: { type: String, default: '' }
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
    },
    image: { type: String, default: '/images/default-user.png' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', default: [] }],
    bookedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: [] }],
  },
}, { timestamps: true });

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// --- This single hook handles broadcasting updates for both save and findOneAndUpdate ---
userSchema.post(/^(save|findOneAndUpdate)$/, function(doc, next) {
  if (global.io && doc) {
    console.log(`[Socket Emit] Triggering 'userUpdated' for User ID: ${doc._id.toString()}`);
    const userData = doc.toObject();
    delete userData.password;
    global.io.to(doc._id.toString()).emit('userUpdated', userData);
  }
  next();
});

// Hook for when a new user is created, to update admin stats
userSchema.post('save', function (doc, next) {
  if (this.isNew) {
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Hook for when a user is deleted, to update admin stats
userSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.to(doc._id.toString()).emit('userDeleted', { _id: doc._id });
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema); */





























































//main
/* const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1 },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true, default: 'customer' },

  // --- Subscription Fields ---
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'elite'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due'],
    default: 'active',
  },
  stripeCustomerId: {
    type: String,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
  },

  // --- Profile Fields ---
  profile: {
    skills: [{ type: String, default: [] }],
    availability: { type: String, default: 'Unavailable' },
    location: {
      fullAddress: { type: String, default: '' },
      details: {
        streetNumber: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        postalCode: { type: String, default: '' }
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
    },
    image: { type: String, default: '/images/default-user.png' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', default: [] }],
    bookedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: [] }],
  },
}, { timestamps: true });

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// --- This single hook handles broadcasting updates for both save and findOneAndUpdate ---
userSchema.post(/^(save|findOneAndUpdate)$/, function(doc, next) {
  if (global.io && doc) {
    console.log(`[Socket Emit] Triggering 'userUpdated' for User ID: ${doc._id.toString()}`);
    const userData = doc.toObject();
    delete userData.password;
    global.io.to(doc._id.toString()).emit('userUpdated', userData);
  }
  next();
});

// Hook for when a new user is created, to update admin stats
userSchema.post('save', function (doc, next) {
  if (this.isNew) {
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});


// Hook for when a user is deleted, to update admin stats
userSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.to(doc._id.toString()).emit('userDeleted', { _id: doc._id });
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema); */
























































