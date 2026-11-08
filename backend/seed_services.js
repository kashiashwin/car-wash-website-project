const mongoose = require('mongoose');
const Service = require('./src/models/Service');

const services = [
  {
    title: 'Basic Wash',
    description: 'Exterior rinse, foam wash, and hand dry. Perfect for a quick refresh.',
    price: 150,
    duration: 30
  },
  {
    title: 'Premium Wash',
    description: 'Full exterior and interior detailing to make your car look brand new.',
    price: 450,
    duration: 60
  },
  {
    title: 'Eco Wash',
    description: 'Water-saving wash using biodegradable products for eco-conscious owners.',
    price: 250,
    duration: 45
  },
  {
    title: 'Full Detailing',
    description: 'Complete deep-clean with paint correction, polish, and ceramic coating.',
    price: 1800,
    duration: 120
  }
];

async function seed() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/carwash_booking');
    console.log('Connected to DB');
    
    // Clear existing services to avoid duplicates
    await Service.deleteMany();
    console.log('Cleared existing services');
    
    await Service.insertMany(services);
    console.log('Services seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
