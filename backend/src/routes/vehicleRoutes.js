const express = require('express');
const {
    getVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle
} = require('../controllers/vehicleController');

const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect); // All vehicle routes require auth

router
    .route('/')
    .get(getVehicles)
    .post(addVehicle);

router
    .route('/:id')
    .put(updateVehicle)
    .delete(deleteVehicle);

module.exports = router;
