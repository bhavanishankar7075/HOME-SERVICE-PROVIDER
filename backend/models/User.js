const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1 },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], required: true, default: 'customer' },
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
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    },
    image: { type: String, default: '/images/default-user.png' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', default: [] }],
    bookedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: [] }],
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  const isDebug = process.env.NODE_ENV === 'development';
  if (this.isModified('password')) {
    if (isDebug) console.log(`[Pre-Save Hook] Hashing password for user: ${this._id || 'new user'}`);
    try {
      this.password = await bcrypt.hash(this.password, 10);
      if (isDebug) console.log(`[Pre-Save Hook] Hashed password (first 10 chars): ${this.password.substring(0, 10)}...`);
      next();
    } catch (err) {
      if (isDebug) console.error('[Pre-Save Hook] Error hashing password:', err);
      next(err);
    }
  } else {
    if (isDebug) console.log(`[Pre-Save Hook] No password modification for user: ${this._id}, skipping hash`);
    next();
  }
});

userSchema.post('save', function (doc, next) {
  if (global.io) {
    const userData = doc.toObject();
    delete userData.password;
    global.io.to(doc._id.toString()).emit('userUpdated', userData);
  }
  if (this.isNew) {
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

userSchema.post('findOneAndUpdate', function (doc, next) {
  if (global.io && doc) {
    const userData = doc.toObject();
    delete userData.password;
    global.io.to(doc._id.toString()).emit('userUpdated', userData);
  }
  next();
});

userSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.to(doc._id.toString()).emit('userDeleted', { _id: doc._id });
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    const isDebug = process.env.NODE_ENV === 'development';
    if (isDebug) {
      console.log('[Match Password] Comparing password for user:', this._id);
    }
    if (!this.password) {
      if (isDebug) console.log('[Match Password] No password stored for user:', this._id);
      return false;
    }
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    if (isDebug) console.log('[Match Password] Password match result:', isMatch);
    return isMatch;
  } catch (err) {
    console.error('[Match Password] Error in matchPassword:', err);
    return false;
  }
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
  profile: {
    skills: [{ type: String, default: [] }],
    availability: { type: String, default: '' },
    location: {
      fullAddress: { type: String, default: null }, // Primary field for detected location
      details: {
        streetNumber: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' }, // Consolidated city here
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        postalCode: { type: String, default: '' }
      }
    },
    image: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    feedback: [{ 
      serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
      feedback: { type: String, default: '' }
    }],
    bookedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: [] }]
  },
  appointments: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Self-reference to User
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  }],
}, { timestamps: true });

// Enhanced pre-save hook with detailed debugging
userSchema.pre('save', async function (next) {
  const isDebug = process.env.NODE_ENV === 'development';
  if (this.isModified('password')) {
    if (isDebug) console.log(`[Pre-Save Hook] Hashing password for user: ${this._id || 'new user'}, isModified: true`);
    try {
      this.password = await bcrypt.hash(this.password, 10);
      if (isDebug) console.log(`[Pre-Save Hook] Hashed password (first 10 chars): ${this.password.substring(0, 10)}...`);
      next();
    } catch (err) {
      if (isDebug) console.error('[Pre-Save Hook] Error hashing password:', err);
      next(err);
    }
  } else {
    if (isDebug) console.log(`[Pre-Save Hook] No password modification for user: ${this._id}, skipping hash`);
    next();
  }
});

// Post-save hook for emitting events (target specific user)
userSchema.post('save', function (doc, next) {
  if (global.io) {
    const userData = doc.toObject();
    delete userData.password;
    userData.profile.image = userData.profile.image ? `/Uploads/${userData.profile.image}` : '';
    global.io.to(doc._id.toString()).emit('userUpdated', userData); // Emit to specific user
  }
  if (this.isNew) {
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Post-findOneAndUpdate hook (with success check)
userSchema.post('findOneAndUpdate', function (doc, next) {
  if (global.io && doc) {
    const userData = doc.toObject();
    delete userData.password;
    userData.profile.image = userData.profile.image ? `/Uploads/${userData.profile.image}` : '';
    global.io.to(doc._id.toString()).emit('userUpdated', userData); // Emit to specific user
  }
  next();
});

// Post-findOneAndDelete hook
userSchema.post('findOneAndDelete', function (doc, next) {
  if (global.io && doc) {
    global.io.to(doc._id.toString()).emit('userDeleted', { _id: doc._id });
    mongoose.models.User.countDocuments().then(count => {
      if (global.io) global.io.emit('usersUpdated', { count });
    }).catch(err => console.error('Error counting users:', err));
  }
  next();
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    const isDebug = process.env.NODE_ENV === 'development';
    if (isDebug) {
      console.log('[Match Password] Comparing password for user:', this._id);
      console.log('[Match Password] Entered password (full):', enteredPassword);
      console.log('[Match Password] Stored hash (full):', this.password);
    }
    if (!this.password) {
      if (isDebug) console.log('[Match Password] No password stored for user:', this._id);
      return false;
    }
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    if (isDebug) console.log('[Match Password] Password match result:', isMatch);
    return isMatch;
  } catch (err) {
    console.error('[Match Password] Error in matchPassword:', err);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema); */
