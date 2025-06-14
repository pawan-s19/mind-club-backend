const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itinerary.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, handleMulterError } = require('../config/multer.config');

// Public routes
router.get('/', itineraryController.getAllItineraries);
router.get('/:id', itineraryController.getItinerary);

// Admin only routes
router.post('/',
    protect,
    authorize('admin'),
    upload,
    handleMulterError,
    itineraryController.createItinerary
);

router.put('/:id',
    protect,
    authorize('admin'),
    upload,
    handleMulterError,
    itineraryController.updateItinerary
);

router.delete('/:id',
    protect,
    authorize('admin'),
    itineraryController.deleteItinerary
);

module.exports = router; 