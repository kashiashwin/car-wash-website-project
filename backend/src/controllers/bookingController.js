const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { sendNotification } = require('../utils/notification');

exports.getBookings = async (req, res, next) => {
    try {
        let query;

        if (req.user.role === 'Customer') {
            query = Booking.find({ customerId: req.user.id, isDeleted: false });
        } else if (req.user.role === 'Staff') {
            query = Booking.find({ staffId: req.user.id, isDeleted: false });
        } else {
            query = Booking.find({ isDeleted: false });
        }

        const bookings = await query.populate({
            path: 'serviceId',
            select: 'title price duration'
        }).populate({
            path: 'customerId',
            select: 'name email phone'
        }).populate({
            path: 'staffId',
            select: 'name'
        });

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (err) {
        next(err);
    }
};

exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('serviceId', 'title price')
            .populate('customerId', 'name email phone')
            .populate('staffId', 'name');

        if (!booking || booking.isDeleted) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        if (req.user.role === 'Customer' && booking.customerId._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        if (req.user.role === 'Staff' && booking.staffId && booking.staffId._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        next(err);
    }
};

exports.createBooking = async (req, res, next) => {
    try {
        req.body.customerId = req.user.id;
        
        const service = await Service.findById(req.body.serviceId);
        if (!service) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        const booking = await Booking.create({
            ...req.body,
            statusHistory: [{ status: 'Pending' }]
        });

        await sendNotification(
            req.user.id, 
            'Booking Confirmed', 
            `Your booking for ${service.title} on ${new Date(booking.bookingDate).toDateString()} at ${booking.bookingTime} is confirmed.`
        );

        res.status(201).json({ success: true, data: booking });
    } catch (err) {
        next(err);
    }
};

exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking || booking.isDeleted) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const oldStatus = booking.status;
        const oldStaff = booking.staffId ? booking.staffId.toString() : null;

        const { status, staffId, notes } = req.body;

        if (req.user.role === 'Customer') {
            if (status === 'Cancelled' && booking.status === 'Pending') {
                booking.status = 'Cancelled';
                booking.statusHistory.push({ status: 'Cancelled' });
            } else {
                return res.status(403).json({ success: false, error: 'Customers can only cancel pending bookings' });
            }
        } 
        else if (req.user.role === 'Staff') {
            if (booking.staffId.toString() !== req.user.id) {
                return res.status(403).json({ success: false, error: 'Not authorized to update this booking' });
            }
            if (status && status !== oldStatus) {
                booking.status = status;
                booking.statusHistory.push({ status });
            }
            if (notes !== undefined) booking.notes = notes;
        } 
        else if (req.user.role === 'Admin') {
            if (status && status !== oldStatus) {
                booking.status = status;
                booking.statusHistory.push({ status });
            }
            if (staffId) booking.staffId = staffId;
            if (notes !== undefined) booking.notes = notes;
            if (req.body.paymentStatus !== undefined) booking.paymentStatus = req.body.paymentStatus;
            if (req.body.advancePaid !== undefined) booking.advancePaid = req.body.advancePaid;
            if (req.body.balanceDue !== undefined) booking.balanceDue = req.body.balanceDue;
            if (req.body.settledAt !== undefined) booking.settledAt = req.body.settledAt;
        }

        await booking.save();

        if (staffId && oldStaff !== staffId) {
             await sendNotification(booking.customerId, 'Booking Assigned', 'A staff member has been assigned to your booking.');
        }

        if (status && status !== oldStatus) {
            let msg = '';
            if (status === 'In Progress') msg = 'Your service has started.';
            if (status === 'Completed') msg = 'Your service has been completed successfully. Thank you for choosing us.';
            if (status === 'Cancelled') msg = 'Your booking has been cancelled.';
            
            if (msg) {
                await sendNotification(booking.customerId, `Booking ${status}`, msg);
            }
        }

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        next(err);
    }
};

exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking || booking.isDeleted) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        booking.isDeleted = true;
        await booking.save();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};
