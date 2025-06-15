const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/upload.controller');

// Route for uploading images
router.post('/image', uploadImage);

module.exports = router; 