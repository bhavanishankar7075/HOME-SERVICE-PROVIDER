// config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// No need for cloudinary.config() anymore!
// The library will automatically use the CLOUDINARY_URL from your environment variables.

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'home-service-uploads', // A folder name in your Cloudinary account
    allowed_formats: ['jpeg', 'png', 'jpg'],
  },
});

module.exports = {
  cloudinary,
  storage,
};