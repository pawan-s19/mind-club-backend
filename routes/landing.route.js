const express = require('express');
const router = express.Router();
const landingController = require('../controllers/landing.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes
router.get('/', landingController.getAllLandings);
router.get('/:id', landingController.getLanding);

// Protected routes (Admin only)
router.post('/', authMiddleware.protect, landingController.createLanding);
router.put('/:id', authMiddleware.protect, landingController.updateLanding);
router.delete('/:id', authMiddleware.protect, landingController.deleteLanding);

module.exports = router;
