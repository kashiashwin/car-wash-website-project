const Service = require('../models/Service');

const defaultServices = [
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

exports.getServices = async (req, res, next) => {
    try {
        let services = await Service.find({ isDeleted: false });
        if (services.length === 0) {
            services = await Service.insertMany(defaultServices);
        }
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
