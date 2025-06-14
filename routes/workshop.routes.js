const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshop.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { upload, handleMulterError } = require('../config/multer.config');

// Public routes
router.get('/', workshopController.getAllWorkshops);
router.get('/:id', workshopController.getWorkshop);

// Admin only routes
router.post('/',
    protect,
    authorize('admin'),
    upload,
    handleMulterError,
    workshopController.createWorkshop
);

router.put('/:id',
    protect,
    authorize('admin'),
    upload,
    handleMulterError,
    workshopController.updateWorkshop
);

router.delete('/:id', protect, authorize('admin'), workshopController.deleteWorkshop);

// Media management routes
router.delete('/:workshopId/media/:type/:fileId',
    protect,
    authorize('admin'),
    workshopController.deleteWorkshopMedia
);

module.exports = router; 