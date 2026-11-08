const mongoose = require('mongoose');

const connectDB = async () => {
    // If already connected or connecting, reuse connection (essential for Vercel Serverless)
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    const uri = process.env.MONGO_URI;

    // Check if running on Vercel without a cloud MongoDB URI
    if (process.env.VERCEL && (!uri || uri.includes('127.0.0.1') || uri.includes('localhost'))) {
        throw new Error('MONGO_URI is missing or points to localhost. Please add your MongoDB Atlas connection string in Vercel Project Settings -> Environment Variables.');
    }

    try {
        const conn = await mongoose.connect(uri || 'mongodb://127.0.0.1:27017/carwash_booking', {
            serverSelectionTimeoutMS: 5000 // Fast failure in 5 seconds instead of buffering hang
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error;
    }
};

module.exports = connectDB;
