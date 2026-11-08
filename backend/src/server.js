const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');

// Load env vars
dotenv.config();

// Connect to database
const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const { initSocket } = require('./config/socket');
initSocket(server);

// Body parser
app.use(express.json());

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Ensure database is connected before handling API requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection failed:', err.message);
        res.status(500).json({ success: false, error: 'Database connection failed. Please check MONGO_URI configuration.' });
    }
});

const path = require('path');
// Serve static frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Swagger setup
const setupSwagger = require('./config/swagger');
setupSwagger(app);

// Mount routers
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/services', require('./routes/serviceRoutes'));
app.use('/api/v1/bookings', require('./routes/bookingRoutes'));
app.use('/api/v1/payments', require('./routes/paymentRoutes'));
app.use('/api/v1/vehicles', require('./routes/vehicleRoutes'));

// Error handling middleware
const errorHandler = require('./middlewares/error');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listener if run directly (local node execution) and not on Vercel serverless
if (!process.env.VERCEL && require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.log(`Error: ${err.message}`);
        server.close(() => process.exit(1));
    });
}

module.exports = app;
