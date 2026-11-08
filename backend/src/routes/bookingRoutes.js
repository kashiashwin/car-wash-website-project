const express = require('express');
const {
    getBookings,
    getBooking,
    createBooking,
    updateBooking,
    deleteBooking
} = require('../controllers/bookingController');

const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getBookings)
    .post(authorize('Customer', 'Admin'), createBooking);

router
    .route('/:id')
    .get(getBooking)
    .put(updateBooking)
    .delete(authorize('Admin'), deleteBooking);

module.exports = router;
