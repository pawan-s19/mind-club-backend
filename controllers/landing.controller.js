const Landing = require('../models/landing.model');
const mediaController = require('./media.controller');
const sharp = require('sharp');

// Helper function to compress base64 image
const compressBase64Image = async (base64Image) => {
    try {
        // Only process valid image data URIs
        if (typeof base64Image !== 'string' || !base64Image.startsWith('data:image')) {
            return base64Image; // Return original if not an image
        }

        // Remove data URL prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Process image with sharp
        const compressedBuffer = await sharp(buffer)
            .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ 
                quality: 80,
                progressive: true
            })
            .toBuffer();

        return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Image compression failed:', error.message);
        throw new Error('Image compression failed. The provided image data may be corrupt or incomplete.');
    }
};

// Helper function to upload any base64 media, compressing only if it's an image
const uploadBase64Media = async (base64String) => {
    try {
        // Ensure we have a valid base64 string
        if (typeof base64String !== 'string' || !base64String.startsWith('data:')) {
            console.log('Skipping upload - not a base64 string:', typeof base64String);
            return base64String;
        }

        console.log('Processing base64 media for upload...');
        let mediaToUpload = base64String;

        // Only compress if it's a new base64 image string
        if (base64String.startsWith('data:image')) {
            console.log('Compressing image before upload...');
            mediaToUpload = await compressBase64Image(base64String);
            console.log('Image compression completed');
        } else {
            console.log('Non-image media detected, skipping compression');
        }
        
        console.log('Uploading to ImageKit...');
        const result = await mediaController.uploadToImageKit(mediaToUpload);
        console.log('Upload successful:', result.url);
        return result;
    } catch (error) {
        console.error('Error in uploadBase64Media:', error.message);
        throw error;
    }
};

// Recursive helper to process all image uploads within the landing data
const processLandingImages = async (data) => {
    console.log('Starting landing image processing...');
    const processedData = JSON.parse(JSON.stringify(data)); // Deep copy

    // A nested helper to check and upload if the field is a base64 string
    const processField = async (fieldValue) => {
        if (typeof fieldValue === 'string' && fieldValue.startsWith('data:')) {
            console.log('Found base64 field, processing upload...');
            try {
                const result = await uploadBase64Media(fieldValue);
                console.log('Field processed successfully');
                return result;
            } catch (error) {
                console.error('Failed to process field:', error.message);
                throw error;
            }
        }
        return fieldValue; // Return as-is if not a new base64 upload
    };

    try {
        if (processedData.hero) {
            console.log('Processing hero images...');
            if (processedData.hero.backgroundImageOrVideo) {
                processedData.hero.backgroundImageOrVideo = await processField(processedData.hero.backgroundImageOrVideo);
            }
            if (processedData.hero.badgeImageOrVideo) {
                processedData.hero.badgeImageOrVideo = await processField(processedData.hero.badgeImageOrVideo);
            }
        }
        
        if (processedData.agencySection?.imageOrVideo) {
            console.log('Processing agency section image...');
            processedData.agencySection.imageOrVideo = await processField(processedData.agencySection.imageOrVideo);
        }
        
        if (processedData.footer?.logoOrVideo) {
            console.log('Processing footer logo...');
            processedData.footer.logoOrVideo = await processField(processedData.footer.logoOrVideo);
        }

        console.log('Landing image processing completed successfully');
        return processedData;
    } catch (error) {
        console.error('Error in processLandingImages:', error.message);
        throw error;
    }
};

// Create landing page content
exports.createLanding = async (req, res) => {
    try {
        // Process all images and get back data with URLs and fileIds
        const landingData = await processLandingImages(req.body);

        const landing = new Landing(landingData);
        await landing.save();

        res.status(201).json({
            success: true,
            message: 'Landing page content created successfully.',
            data: landing
        });
    } catch (error) {
        console.error('Landing creation error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Invalid input'
        });
    }
};

// Get all landing pages (Public)
exports.getAllLandings = async (req, res) => {
    try {
        const landings = await Landing.find({})
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: landings.length,
            data: landings
        });
    } catch (error) {
        console.error('Error fetching landings:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Get single landing page (Public)
exports.getLanding = async (req, res) => {
    try {
        const landing = await Landing.findById(req.params.id).lean();

        if (!landing) {
            return res.status(404).json({
                success: false,
                error: 'Landing page not found'
            });
        }

        res.status(200).json({
            success: true,
            data: landing
        });
    } catch (error) {
        console.error('Error fetching landing:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Update landing page content
exports.updateLanding = async (req, res) => {
    try {
        const landingToUpdate = await Landing.findById(req.params.id);
        if (!landingToUpdate) {
            return res.status(404).json({ success: false, error: 'Landing page not found' });
        }

        // --- Collect File IDs of all old images for potential deletion ---
        const oldFileIds = [];
        const collectFileIds = (obj) => {
            if (obj && obj.fileId) oldFileIds.push(obj.fileId);
            if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(collectFileIds);
            }
        };
        collectFileIds(landingToUpdate.toJSON());
        
        // --- Process incoming data, uploading any new base64 images ---
        const landingData = await processLandingImages(req.body);

        // --- Update landing in DB ---
        const updatedLanding = await Landing.findByIdAndUpdate(
            req.params.id,
            landingData,
            { new: true, runValidators: true }
        );

        // --- After successful update, delete old files from ImageKit ---
        const newFileIds = new Set();
        const collectNewFileIds = (obj) => {
            if (obj && obj.fileId) newFileIds.add(obj.fileId);
            if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(collectNewFileIds);
            }
        };
        collectNewFileIds(updatedLanding.toJSON());

        const fileIdsToDelete = oldFileIds.filter(id => !newFileIds.has(id));

        if (fileIdsToDelete.length > 0) {
            console.log(`Deleting ${fileIdsToDelete.length} old files from ImageKit...`);
            await Promise.all(fileIdsToDelete.map(id => 
                mediaController.deleteFromImageKit(id).catch(err => 
                    console.warn(`Failed to delete old file ${id} from ImageKit:`, err.message)
                )
            ));
        }

        res.status(200).json({
            success: true,
            message: 'Landing page updated successfully.',
            data: updatedLanding
        });
    } catch (error) {
        console.error('Landing update error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Invalid input'
        });
    }
};

// Delete landing page (Admin only)
exports.deleteLanding = async (req, res) => {
    try {
        const landing = await Landing.findById(req.params.id);

        if (!landing) {
            return res.status(404).json({ success: false, error: 'Landing page not found' });
        }

        // --- Collect all fileIds and prepare response data before deletion ---
        const fileIdsToDelete = [];
        const collectFileIds = (obj) => {
            if (obj && obj.fileId) fileIdsToDelete.push(obj.fileId);
            if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(collectFileIds);
            }
        };
        const deletedLandingData = landing.toJSON();
        collectFileIds(deletedLandingData);

        // --- Delete landing document from DB first ---
        await Landing.findByIdAndDelete(req.params.id);
        console.log('Landing document deleted from database:', req.params.id);

        // --- Now, delete files from ImageKit ---
        if (fileIdsToDelete.length > 0) {
            console.log(`Deleting ${fileIdsToDelete.length} associated files from ImageKit...`);
            await Promise.all(fileIdsToDelete.map(id => 
                mediaController.deleteFromImageKit(id).catch(err => 
                    console.warn(`Failed to delete file ${id} from ImageKit:`, err.message)
                )
            ));
        }

        // Fetch all remaining landings to return in the response
        const allLandings = await Landing.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            message: 'Landing page and associated media deleted successfully',
            count: allLandings.length,
            data: allLandings
        });
    } catch (error) {
        console.error('Error in deleteLanding:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
