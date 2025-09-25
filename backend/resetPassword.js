// resetPassword.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const uri = 'mongodb+srv://home-service-provider:homeserviceprovider@cluster0.dzfuatk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your MONGO_URI
const userId = '68bc90a1132bd103841dd4d8';

async function resetPassword() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('user123', salt);
    console.log('Generated hash for user123:', newHash);

    // Set skip flag to bypass pre-save hook
    user.skipPasswordHash = true;
    user.password = newHash;
    const updatedUser = await user.save({ validateBeforeSave: false }); // Skip validation if needed
    console.log('Password updated for user:', updatedUser._id, 'Hash:', updatedUser.password);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error resetting password:', err);
    await mongoose.disconnect();
  }
}

resetPassword();