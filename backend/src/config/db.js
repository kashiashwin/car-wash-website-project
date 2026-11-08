const mongoose = require('mongoose');

const connectDB = async () => {
    // If already connected or connecting, reuse connection (essential for Vercel Serverless)
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/carwash_booking');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
