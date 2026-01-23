// config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'home-service-uploads', 
    allowed_formats: ['jpeg', 'png', 'jpg','avif'],
  },
});

module.exports = {
  cloudinary,
  storage,
};