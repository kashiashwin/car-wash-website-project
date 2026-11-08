const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    staffId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User' // Staff might be assigned later
    },
    serviceId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Service',
        required: true
    },
    bookingDate: {
        type: Date,
        required: [true, 'Please add a booking date']
    },
    bookingTime: {
        type: String, // e.g., '14:00'
        required: [true, 'Please add a booking time']
    },
    price: {
        type: Number,
        default: 0
    },
    advancePaid: {
        type: Number,
        default: 0
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Washing', 'Polishing', 'Ready for Pickup', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    statusHistory: [
        {
            status: { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Partial - Advance Paid', 'Fully Paid'],
        default: 'Pending'
    },
    settledAt: {
        type: Date
    },
    paymentId: {
        type: String // Razorpay payment ID
    },
    notes: {
        type: String,
        default: ''
    },
    isDeleted: {
        type: Boolean,
        default: false // Soft delete
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', BookingSchema);
