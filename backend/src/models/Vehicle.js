const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: [true, 'Please select a vehicle type']
    },
    name: {
        type: String,
        required: [true, 'Please provide a name for this vehicle']
    },
    plate: {
        type: String,
        required: [true, 'Please provide the number plate']
    },
    color: {
        type: String,
        required: [true, 'Please provide the color']
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to ensure only one primary vehicle per user
VehicleSchema.pre('save', async function() {
    if (this.isPrimary) {
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { isPrimary: false }
        );
    }
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
