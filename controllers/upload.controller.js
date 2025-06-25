const mediaController = require('./media.controller');

// Controller for uploading images
const uploadImage = async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 image data

        if (!image) {
            return res.status(400).json({ message: 'No image data provided' });
        }

        console.log('Uploading image via media controller...');

        // Upload to ImageKit using the centralized media controller
        const result = await mediaController.uploadToImageKit(image, 'mind-club');

        res.status(200).json({
            success: true,
            data: {
                url: result.url,
                fileId: result.fileId
            }
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
};

const deleteImageFromImageKit = async (imageData) => {
    if (imageData?.fileId) {
        try {
            await mediaController.deleteFromImageKit(imageData.fileId);
            console.log('Successfully deleted image:', imageData.fileId);
        } catch (error) {
            console.log('Error deleting image:', error.message);
        }
    }
};

module.exports = {
    uploadImage
}; 