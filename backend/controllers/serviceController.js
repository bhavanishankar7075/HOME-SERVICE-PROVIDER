const asyncHandler = require('express-async-handler');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Joi = require('joi');
const path = require('path');
const fs = require('fs').promises;

const serviceSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  description: Joi.string().required().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  }),
  price: Joi.number().required().messages({
    'number.base': 'Price must be a number',
    'any.required': 'Price is required',
  }),
  category: Joi.string().valid('Home Maintenance', 'Cleaning', 'Plumbing', 'Electrical', 'Painting', 'Carpentry', 'Landscaping').required().messages({
    'any.only': 'Category must be one of Home Maintenance, Cleaning, Plumbing, Electrical, Painting, Carpentry, Landscaping',
    'any.required': 'Category is required',
  }),
  offer: Joi.string().allow('').optional(),
  deal: Joi.string().allow('').optional(),
  retainedImageUrls: Joi.array().items(Joi.string()).optional(),
  
  availableSlots: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string())).optional().messages({
    'object.pattern.base': 'Available slots must be an object with date strings as keys and time arrays as values',
  }),
}).unknown(true);

const deleteFile = async (filePath) => {
  try {
    if (filePath) {
      const fullPath = path.join(__dirname, '..', filePath);
      await fs.unlink(fullPath);
      console.log(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
};

const createService = [
  asyncHandler(async (req, res) => {
    const { error } = serviceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { name, description, price, category, offer, deal } = req.body;
    const image = req.files?.image ? `/uploads/services/${req.files.image[0].filename}` : '';
    const additionalImages = req.files?.additionalImages
      ? req.files.additionalImages.map(file => `/uploads/services/${file.filename}`)
      : [];

    const service = await Service.create({
      name,
      description,
      price: parseFloat(price),
      category,
      createdBy: req.user._id,
      image,
      additionalImages,
      offer: offer || '',
      deal: deal || '',
      availableSlots: {},
    });

    const createdService = await Service.findById(service._id).populate('createdBy', 'name');
    const serviceCount = await Service.countDocuments();
    if (global.io) {
      global.io.emit('servicesUpdated', { count: serviceCount });
      // Use a more specific event for adding a new service
      global.io.emit('serviceAdded', createdService);
    }

    res.status(201).json(createdService);
  }),
];

const getServices = asyncHandler(async (req, res) => {
  const { name, category, price_gte, price_lte, offer, deal, sort } = req.query;
  const query = {};

  if (name) query.name = { $regex: name, $options: 'i' };
  if (category) query.category = category;
  if (price_gte && price_lte) query.price = { $gte: parseFloat(price_gte), $lte: parseFloat(price_lte) };
  if (offer === 'yes') query.offer = { $ne: '' };
  else if (offer === 'no') query.offer = '';
  if (deal === 'yes') query.deal = { $ne: '' };
  else if (deal === 'no') query.deal = '';

  let services = Service.find(query).populate('createdBy', 'name');
  if (sort === 'price_asc') services = services.sort({ price: 1 });
  else if (sort === 'price_desc') services = services.sort({ price: -1 });
  else if (sort === 'createdAt_asc') services = services.sort({ createdAt: 1 });
  else if (sort === 'createdAt_desc') services = services.sort({ createdAt: -1 });

  const result = await services;
  res.json(result);
});

const updateService = [
  asyncHandler(async (req, res) => {
    // Parse formData fields into an object
    const formDataObj = {};
    for (let [key, value] of Object.entries(req.body)) {
      if (key === 'availableSlots' && typeof value === 'string') {
        try {
          formDataObj[key] = JSON.parse(value); // Parse JSON string into object
        } catch (e) {
          console.error('Error parsing availableSlots:', e.message);
          return res.status(400).json({ msg: `Invalid availableSlots format: ${e.message}` });
        }
      } else if (key === 'retainedImageUrls' && typeof value === 'string') {
        try {
          formDataObj[key] = JSON.parse(value); // Parse JSON string into array
        } catch (e) {
          console.error('Error parsing retainedImageUrls:', e.message);
          return res.status(400).json({ msg: `Invalid retainedImageUrls format: ${e.message}` });
        }
      } else if (Array.isArray(value)) {
        formDataObj[key] = value;
      } else {
        formDataObj[key] = value;
      }
    }

    // Debug log for retainedImageUrls
    console.log('Received retainedImageUrls:', req.body.retainedImageUrls);

    const { error } = serviceSchema.validate(formDataObj);
    if (error) {
      console.error('Validation error:', error.details);
      return res.status(400).json({ msg: error.details[0].message });
    }

    const { name, description, price, category, offer, deal, retainedImageUrls, availableSlots: availableSlotsInput } = formDataObj;
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }

    if (service.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to update this service' });
    }

    const newImage = req.files?.image ? `/uploads/services/${req.files.image[0].filename}` : undefined;
    const additionalImages = req.files?.additionalImages
      ? req.files.additionalImages.map(file => `/uploads/services/${file.filename}`)
      : [];

    if ((newImage !== undefined || formDataObj.image === '') && service.image) {
      await deleteFile(service.image);
      service.image = newImage || '';
    }

    let retainedUrls = [];
    if (retainedImageUrls) {
      retainedUrls = Array.isArray(retainedImageUrls) ? retainedImageUrls : [retainedImageUrls];
      const invalidUrls = retainedUrls.filter(url => !service.additionalImages.includes(url));
      if (invalidUrls.length > 0) {
        console.warn('Invalid retained image URLs:', invalidUrls);
        retainedUrls = retainedUrls.filter(url => service.additionalImages.includes(url));
      }
      const imagesToDelete = service.additionalImages.filter(img => !retainedUrls.includes(img));
      for (const img of imagesToDelete) {
        await deleteFile(img);
      }
    }

    const uniqueAdditionalImages = [...new Set(additionalImages)];
    if (uniqueAdditionalImages.length < additionalImages.length) {
      console.warn('Duplicate additional images detected:', additionalImages);
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.price = price ? parseFloat(price) : service.price;
    service.category = category || service.category;
    service.offer = offer !== undefined ? offer : service.offer;
    service.deal = deal !== undefined ? deal : service.deal;
    service.additionalImages = [...retainedUrls, ...uniqueAdditionalImages];

    // Process availableSlots
    const availableSlots = new Map();
    if (availableSlotsInput && typeof availableSlotsInput === 'object' && !Array.isArray(availableSlotsInput)) {
      Object.entries(availableSlotsInput).forEach(([date, times]) => {
        if (date && Array.isArray(times)) {
          availableSlots.set(date, times.filter(time => time && typeof time === 'string'));
        }
      });
    }
    service.availableSlots = availableSlots;

    try {
      const updatedService = await service.save();
      const populatedService = await Service.findById(updatedService._id).populate('createdBy', 'name');
      const serviceCount = await Service.countDocuments();
      if (global.io) {
        global.io.emit('servicesUpdated', { count: serviceCount });
        global.io.emit('serviceUpdated', populatedService);
        global.io.emit('bookingUpdated');
      }
      res.json(populatedService);
    } catch (error) {
      console.error('Error saving service:', error.message);
      return res.status(400).json({ msg: `Error saving service: ${error.message}` });
    }
  }),
];

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ msg: 'Service not found' });
  }

  if (service.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized to delete this service' });
  }

  if (service.image) await deleteFile(service.image);
  for (const img of service.additionalImages) {
    await deleteFile(img);
  }

  await Service.findByIdAndDelete(req.params.id);
  const serviceCount = await Service.countDocuments();
  if (global.io) {
    global.io.emit('servicesUpdated', { count: serviceCount });
    global.io.emit('serviceDeleted', { _id: req.params.id });
  }

  res.json({ msg: 'Service deleted' });
});

const bulkDeleteServices = asyncHandler(async (req, res) => {
  const { serviceIds } = req.body;
  if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return res.status(400).json({ msg: 'Service IDs array is required' });
  }

  const services = await Service.find({ _id: { $in: serviceIds } });
  if (services.length !== serviceIds.length) {
    return res.status(404).json({ msg: 'One or more services not found' });
  }

  for (const service of services) {
    if (service.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to delete one or more services' });
    }

    if (service.image) await deleteFile(service.image);
    for (const img of service.additionalImages) {
      await deleteFile(img);
    }
  }

  await Service.deleteMany({ _id: { $in: serviceIds } });
  const serviceCount = await Service.countDocuments();
  if (global.io) {
    global.io.emit('servicesUpdated', { count: serviceCount });
    global.io.emit('servicesBulkDeleted', { serviceIds });
  }

  res.json({ msg: 'Services deleted successfully' });
});

const getFeaturedServices = asyncHandler(async (req, res) => {
  const services = await Service.find({}).sort({ createdAt: -1 }).limit(3);
  res.json(services);
});

/* const getServiceAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { serviceId } = req.params;

  if (!date || !serviceId) {
    return res.status(400).json({ message: 'Service ID and date are required' });
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookingsOnDate = await Booking.find({
    serviceId: serviceId,
    scheduledTime: { $gte: startOfDay, $lte: endOfDay },
  });

  const bookedTimes = bookingsOnDate.map(booking => {
    const time = new Date(booking.scheduledTime);
    return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  });

  const allSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
  
  res.json(availableSlots);
}); */


// In getServiceAvailability

const getServiceAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { serviceId } = req.params;

  if (!date || !serviceId) {
    return res.status(400).json({ message: 'Service ID and date are required' });
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  // 1. Get the provider-defined slots for the given date.
  // The date format must match what you use as a key (e.g., 'YYYY-MM-DD')
  const providerSlots = service.availableSlots.get(date) || [];
   
   // If the provider has not set any slots for this day, return empty.
   if (providerSlots.length === 0) {
     return res.json([]);
   }

  // 2. Find already booked times for that service on that day.
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const bookingsOnDate = await Booking.find({
    serviceId: serviceId,
    // Using scheduledTime from your booking schema
    scheduledTime: { $gte: startOfDay, $lte: endOfDay },
  });

  const bookedTimes = bookingsOnDate.map(booking => {
    const time = new Date(booking.scheduledTime);
    // Format to HH:MM to match your stored slots
    return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
  });

  // 3. Filter the provider's slots to find what's truly available.
  const availableSlots = providerSlots.filter(slot => !bookedTimes.includes(slot));
  
  res.json(availableSlots);
});

module.exports = { 
  createService, 
  getServices, 
  updateService, 
  deleteService, 
  bulkDeleteServices,
  getFeaturedServices,
  getServiceAvailability,
};