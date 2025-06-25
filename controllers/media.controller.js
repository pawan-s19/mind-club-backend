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
            console.log('Processing base64 data URI...');
            
            // Extract the base64 data with improved regex
            const matches = file.match(/^data:([A-Za-z0-9/.-]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                console.error('Invalid base64 data format:', file.substring(0, 100));
                throw new Error('Invalid base64 data format');
            }
            
            const mimeType = matches[1];
            const base64Data = matches[2];
            
            console.log('MIME type detected:', mimeType);
            
            // Validate base64 data
            if (!base64Data || base64Data.length === 0) {
                throw new Error('Empty base64 data');
            }
            
            try {
                fileData = Buffer.from(base64Data, 'base64');
                console.log('Base64 decoded successfully, buffer size:', fileData.length);
            } catch (bufferError) {
                console.error('Failed to decode base64:', bufferError.message);
                throw new Error('Invalid base64 encoding');
            }
            
            // Determine file extension from MIME type
            const extension = mimeType.split('/')[1] || 'jpg';
            fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2)}.${extension}`;
            
            console.log('Generated filename:', fileName);
        } 
        // Handle file path
        else if (file.path) {
            console.log('Processing file from path:', file.path);
            fileData = fs.readFileSync(file.path);
            fileName = file.filename;
            // Delete the temporary file
            fs.unlinkSync(file.path);
        } else {
            console.error('Invalid file data type:', typeof file);
            throw new Error('Invalid file data');
        }

        console.log('Uploading to ImageKit with folder:', folder);
        
        const uploadResponse = await imagekit.upload({
            file: fileData,
            fileName: fileName,
            folder: folder
        });

        console.log('Upload successful:', uploadResponse.url);
        
        return {
            url: uploadResponse.url,
            fileId: uploadResponse.fileId
        };
    } catch (error) {
        console.error('Upload to ImageKit failed:', error.message);
        
        // Delete the temporary file if it exists
        if (file && file.path && fs.existsSync(file.path)) {
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

// Test ImageKit configuration
exports.testImageKitConnection = async () => {
    try {
        console.log('Testing ImageKit connection...');
        console.log('Public Key:', process.env.IMAGEKIT_PUBLIC_KEY ? 'Set' : 'Not set');
        console.log('Private Key:', process.env.IMAGEKIT_PRIVATE_KEY ? 'Set' : 'Not set');
        console.log('URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT ? 'Set' : 'Not set');
        
        // Test with a simple file list request
        const files = await imagekit.listFiles({
            limit: 1
        });
        
        console.log('ImageKit connection successful');
        return { success: true, message: 'ImageKit connection successful' };
    } catch (error) {
        console.error('ImageKit connection failed:', error.message);
        return { success: false, error: error.message };
    }
}; 