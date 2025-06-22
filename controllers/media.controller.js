const imagekit = require('../config/imagekit.config');
const fs = require('fs');
const path = require('path');

// Upload file to ImageKit
exports.uploadToImageKit = async (file, folder = 'workshops') => {
    try {
        let fileData;
        let fileName;

        // Handle base64 data
        if (typeof file === 'string' && file.startsWith('data:')) {
            // Log the start of the file string to help debug
            console.log('Attempting to process Data URI:', file.substring(0, 100));

            // Extract the base64 data. Made the regex safer for different MIME types.
            const matches = file.match(/^data:([A-Za-z0-9/.-]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                console.error('Regex match failed. The Data URI format is invalid.');
                throw new Error('Invalid base64 data');
            }
            fileData = Buffer.from(matches[2], 'base64');
            fileName = `media_${Date.now()}.${matches[1].split('/')[1]}`;
        } 
        // Handle file path
        else if (file.path) {
            fileData = fs.readFileSync(file.path);
            fileName = file.filename;
            // Delete the temporary file
            fs.unlinkSync(file.path);
        } else {
            throw new Error('Invalid file data');
        }

        const uploadResponse = await imagekit.upload({
            file: fileData,
            fileName: fileName,
            folder: folder
        });

        return {
            url: uploadResponse.url,
            fileId: uploadResponse.fileId
        };
    } catch (error) {
        // Delete the temporary file if it exists
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
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