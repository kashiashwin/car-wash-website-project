const User = require('../models/User');

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: 'Customer' // Force Customer role for public registration
        });

        sendTokenResponse(user, 201, res);
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }

        email = email.trim().toLowerCase();
        const query = (email === 'admin') 
            ? { $or: [{ email: 'admin' }, { email: 'admin@admin.com' }] } 
            : { email: { $regex: new RegExp(`^${email}$`, 'i') } };

        const user = await User.findOne(query).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        next(err);
    }
};

exports.updateMe = async (req, res, next) => {
    try {
        const { name, email, phone, currentPassword, password } = req.body;
        
        // Find user and explicitly select password to check it later
        const user = await User.findById(req.user.id).select('+password');

        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, error: 'Please provide current password to change password' });
            }
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Incorrect current password' });
            }
            user.password = password;
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        await user.save(); // triggers pre-save hook for password hash if modified

        // Send a new token in case we want them to stay logged in with updated details
        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

exports.getStats = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ customerId: req.user.id, status: 'Completed' }).populate('serviceId');
        
        const totalWashes = bookings.length;
        const totalSpent = bookings.reduce((acc, b) => acc + (b.serviceId ? b.serviceId.price : 0), 0);
        const rewardPoints = Math.floor(totalSpent * 0.1);
        
        const savedCars = await Vehicle.countDocuments({ userId: req.user.id });

        res.status(200).json({
            success: true,
            data: {
                totalWashes,
                totalSpent,
                rewardPoints,
                savedCars
            }
        });
    } catch (err) {
        next(err);
    }
};
