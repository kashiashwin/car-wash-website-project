const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');

let razorpayInstance;

const getRazorpay = () => {
    if (!razorpayInstance && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};

exports.createOrder = async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        
        const booking = await Booking.findById(bookingId).populate('serviceId');
        
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        if (req.user.role === 'Customer' && booking.customerId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const rzp = getRazorpay();
        if (!rzp) {
            return res.status(500).json({ success: false, error: 'Razorpay is not configured' });
        }

        const amount = booking.serviceId.price * 100; // Assuming price is in INR, convert to paisa

        const options = {
            amount,
            currency: 'INR',
            receipt: `receipt_${booking._id}`,
        };

        const order = await rzp.orders.create(options);
        
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        next(err);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Payment verification failed' });
        }

        const booking = await Booking.findById(bookingId);
        if (booking) {
            booking.paymentStatus = 'Paid';
            booking.paymentId = razorpay_payment_id;
            await booking.save();
        }

        res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } catch (err) {
        next(err);
    }
};
