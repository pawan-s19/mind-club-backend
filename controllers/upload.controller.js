const ImageKit = require('imagekit');

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Controller for uploading images
const uploadImage = async (req, res) => {
    try {
        const { image } = req.body; // Expecting base64 image data

        if (!image) {
            return res.status(400).json({ message: 'No image data provided' });
        }

        // Upload to ImageKit
        const result = await imagekit.upload({
            file: image, // base64 image data
            fileName: `image_${Date.now()}.jpg`, // Generate unique filename
            folder: '/mind-club' // Optional: specify folder in ImageKit
        });

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