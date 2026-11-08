const express = require('express');
const {
    getServices,
    getService,
    createService,
    updateService,
    deleteService
} = require('../controllers/serviceController');

const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router
    .route('/')
    .get(getServices)
    .post(protect, authorize('Admin'), createService);

router
    .route('/:id')
    .get(getService)
    .put(protect, authorize('Admin'), updateService)
    .delete(protect, authorize('Admin'), deleteService);

module.exports = router;
