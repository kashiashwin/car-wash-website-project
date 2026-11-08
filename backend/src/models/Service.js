const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a service title'],
        trim: true,
        maxlength: [50, 'Title can not be more than 50 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    duration: {
        type: Number, // duration in minutes
        required: [true, 'Please add service duration in minutes']
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

module.exports = mongoose.model('Service', ServiceSchema);
