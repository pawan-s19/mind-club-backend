const imagekit = require('../config/imagekit.config');

// Upload file to ImageKit
exports.uploadToImageKit = async (file, folder = 'workshops') => {
    try {
        const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: file.originalname,
            folder: folder
        });

        return {
            url: uploadResponse.url,
            fileId: uploadResponse.fileId
        };
    } catch (error) {
        throw error;
    }
};

// Delete file from ImageKit
exports.deleteFromImageKit = async (fileId) => {
    try {
        await imagekit.deleteFile(fileId);
        return true;
    } catch (error) {
        throw error;
    }
};

// Get file details from ImageKit
exports.getFileDetails = async (fileId) => {
    try {
        const fileDetails = await imagekit.getFileDetails(fileId);
        return fileDetails;
    } catch (error) {
        throw error;
    }
}; 