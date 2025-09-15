const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    // Use MONGO_URI from .env file
    const uri = "mongodb+srv://home-service-provider:homeserviceprovider@cluster0.dzfuatk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }
    console.log('Connecting to MongoDB with URI:', uri);

    // Connect to MongoDB
    const connection = await mongoose.connect(uri, {
      useUnifiedTopology: true, // Ensure compatibility
    });
    console.log('Connected to MongoDB at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Current database:', connection.connection.db.databaseName);
    console.log('Available collections:', await connection.connection.db.listCollections().toArray());

    // Target the existing 'services' collection directly
    const servicesCollection = connection.connection.db.collection('services');
    const deleteResult = await servicesCollection.deleteMany({});
    console.log('Cleared existing services in "services" collection. Deleted count:', deleteResult.deletedCount);

    // Find or create an admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1234567890',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
      });
      await adminUser.save();
      console.log('Created admin user:', adminUser.email, 'ID:', adminUser._id);
    } else {
      console.log('Found existing admin user:', adminUser.email, 'ID:', adminUser._id);
    }

    // Seed services into the 'services' collection
    const services = [
      {
        name: 'Plumbing Services',
        description: 'Professional plumbing repairs and installations.',
        price: 500,
        category: 'Home Maintenance',
        createdBy: adminUser._id.toString(), // Convert to string to match possible existing schema
      },
      {
        name: 'Deep Cleaning',
        description: 'Thorough home cleaning for a spotless environment.',
        price: 300,
        category: 'Cleaning',
        createdBy: adminUser._id.toString(),
      },
      {
        name: 'Electrical Repairs',
        description: 'Wiring and electrical system fixes.',
        price: 600,
        category: 'Electrical',
        createdBy: adminUser._id.toString(),
      },
      {
        name: 'Interior Painting',
        description: 'High-quality interior painting services.',
        price: 800,
        category: 'Painting',
        createdBy: adminUser._id.toString(),
      },
      {
        name: 'Custom Carpentry',
        description: 'Furniture design and repair services.',
        price: 700,
        category: 'Carpentry',
        createdBy: adminUser._id.toString(),
      },
      {
        name: 'Garden Landscaping',
        description: 'Design and maintenance of outdoor spaces.',
        price: 900,
        category: 'Landscaping',
        createdBy: adminUser._id.toString(),
      },
    ];

    const insertResult = await servicesCollection.insertMany(services, { ordered: false });
    console.log('Seeded', insertResult.insertedCount, 'services into "services" collection at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Inserted service IDs:', insertResult.insertedIds);

    // Verify data in the 'services' collection
    const seededServices = await servicesCollection.find().toArray();
    console.log('Verified services count in "services" collection:', seededServices.length);
    console.log('Verified services:', seededServices);

  } catch (err) {
    console.error('Seeding error:', err.message);
    if (err.name === 'MongoNetworkError') {
      console.error('Network error. Ensure MongoDB is running on localhost:27017.');
    } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
      console.error('MongoDB Error Details:', err);
    } else {
      console.error('Unexpected error:', err.stack);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedDatabase();