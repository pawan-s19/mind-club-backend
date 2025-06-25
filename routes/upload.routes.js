const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/upload.controller');
const mediaController = require('../controllers/media.controller');

// Route for uploading images
router.post('/image', uploadImage);

// Test route for ImageKit connection
router.get('/test-imagekit', async (req, res) => {
    try {
        const result = await mediaController.testImageKitConnection();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test route for base64 upload
router.post('/test-base64', async (req, res) => {
    try {
        const { base64Data } = req.body;
        
        if (!base64Data) {
            return res.status(400).json({
                success: false,
                error: 'No base64 data provided'
            });
        }

        console.log('Testing base64 upload...');
        const result = await mediaController.uploadToImageKit(base64Data, 'test');
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Base64 test upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 