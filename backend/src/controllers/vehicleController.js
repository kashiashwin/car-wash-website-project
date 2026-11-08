const Vehicle = require('../models/Vehicle');

// Get all vehicles for logged in user
exports.getVehicles = async (req, res, next) => {
    try {
        const vehicles = await Vehicle.find({ userId: req.user.id }).sort('-createdAt');
        res.status(200).json({ success: true, data: vehicles });
    } catch (err) {
        next(err);
    }
};

// Add new vehicle
exports.addVehicle = async (req, res, next) => {
    try {
        req.body.userId = req.user.id;
        
        // If it's their first vehicle, make it primary automatically
        const count = await Vehicle.countDocuments({ userId: req.user.id });
        if (count === 0) {
            req.body.isPrimary = true;
        }

        const vehicle = await Vehicle.create(req.body);
        res.status(201).json({ success: true, data: vehicle });
    } catch (err) {
        next(err);
    }
};

// Update vehicle
exports.updateVehicle = async (req, res, next) => {
    try {
        let vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        if (vehicle.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // We use save() here to trigger the pre-save hook for isPrimary logic if needed
        Object.assign(vehicle, req.body);
        await vehicle.save();

        res.status(200).json({ success: true, data: vehicle });
    } catch (err) {
        next(err);
    }
};

// Delete vehicle
exports.deleteVehicle = async (req, res, next) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }
        
        if (vehicle.userId.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        await vehicle.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
