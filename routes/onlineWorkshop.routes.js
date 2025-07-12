const express = require('express');
const router = express.Router();
const onlineWorkshopController = require('../controllers/onlineWorkshop.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', onlineWorkshopController.getAllOnlineWorkshops);
router.get('/:id', onlineWorkshopController.getOnlineWorkshop);

// Admin only routes
router.post('/',
    // protect,
    // authorize('admin'),
    onlineWorkshopController.createOnlineWorkshop
);

router.put('/:id',
    // protect,
    // authorize('admin'),
    onlineWorkshopController.updateOnlineWorkshop
);

router.delete('/:id', 
    // protect, 
    // authorize('admin'), 
    onlineWorkshopController.deleteOnlineWorkshop
);

module.exports = router; 