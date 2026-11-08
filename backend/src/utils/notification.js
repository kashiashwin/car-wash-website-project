const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIo } = require('../config/socket');
const twilio = require('twilio');

exports.sendNotification = async (userId, title, message) => {
    try {
        // Save to database
        const notification = await Notification.create({
            userId,
            title,
            message
        });

        // Emit via Socket.io
        try {
            const io = getIo();
            io.to(userId.toString()).emit('notification', notification);
        } catch (socketErr) {
            console.error('Socket not available to emit notification', socketErr);
        }

        // Send SMS via Twilio
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid') {
                const user = await User.findById(userId);
                if (user && user.phone) {
                    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                    await client.messages.create({
                        body: `${title}: ${message}`,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: user.phone
                    });
                }
            }
        } catch (smsErr) {
            console.error('Error sending SMS', smsErr);
        }

    } catch (err) {
        console.error('Error sending notification', err);
    }
};
