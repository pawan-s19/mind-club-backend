const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
};

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 50MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files uploaded.'
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next(err);
};

// Configure upload with memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 30 // Maximum 30 files per request
    }
}).fields([
    { name: 'banner', maxCount: 1 },
    { name: 'gallery', maxCount: 10 },
    { name: 'itinerary.activities.image', maxCount: 20 }
]);

// Cleanup function to remove temporary files
const cleanupFiles = (files) => {
    if (!files) return;
    
    Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    });
};

module.exports = {
    upload,
    handleMulterError,
    cleanupFiles
}; 