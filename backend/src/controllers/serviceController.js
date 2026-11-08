const Service = require('../models/Service');

exports.getServices = async (req, res, next) => {
    try {
        const services = await Service.find({ isDeleted: false });
        res.status(200).json({ success: true, count: services.length, data: services });
    } catch (err) {
        next(err);
    }
};

exports.getService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service || service.isDeleted) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }
        res.status(200).json({ success: true, data: service });
    } catch (err) {
        next(err);
    }
};

exports.createService = async (req, res, next) => {
    try {
        const service = await Service.create(req.body);
        res.status(201).json({ success: true, data: service });
    } catch (err) {
        next(err);
    }
};

exports.updateService = async (req, res, next) => {
    try {
        let service = await Service.findById(req.params.id);
        if (!service || service.isDeleted) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        service = await Service.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: service });
    } catch (err) {
        next(err);
    }
};

exports.deleteService = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service || service.isDeleted) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        service.isDeleted = true;
        await service.save();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
