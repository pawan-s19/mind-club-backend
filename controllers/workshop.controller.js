const Workshop = require('../models/workshop.model');
const mediaController = require('./media.controller');
const sharp = require('sharp');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

// Helper function to compress image
const compressImage = async (file) => {
    try {
        // If not an image, return as is
        if (!file.mimetype.startsWith('image/')) {
            return file;
        }

        // Check if file has buffer
        if (!file.buffer) {
            console.error('No buffer found in file:', file.originalname);
            return file;
        }

        // Process image with sharp
        const compressedBuffer = await sharp(file.buffer)
            .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ 
                quality: 80,
                progressive: true
            })
            .toBuffer();

        return {
            ...file,
            buffer: compressedBuffer,
            size: compressedBuffer.length
        };
    } catch (error) {
        console.error('Error compressing image:', error);
        // If compression fails, return original file
        return file;
    }
};

// Helper function to process files in batches
const processFilesInBatches = async (files, batchSize = 3) => {
    try {
        const results = [];
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(file => compressImage(file))
            );
            results.push(...batchResults);
        }
        return results;
    } catch (error) {
        console.error('Error processing files in batches:', error);
        throw error;
    }
};

// Helper function to compress base64 image
const compressBase64Image = async (base64Image) => {
    try {
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
        console.error('Error compressing image:', error);
        // If compression fails, return original base64
        return base64Image;
    }
};

// Helper function to parse itinerary data
const parseItineraryData = (body) => {
    try {
        const itinerary = [];
        const dayPattern = /itinerary\[(\d+)\]\[day\]/;
        const activityPattern = /itinerary\[(\d+)\]\[activities\]\[(\d+)\]\[(time|activity)\]/;

        // Get all form fields
        const fields = Object.keys(body);
        
        // Group fields by day
        const days = {};
        fields.forEach(field => {
            const dayMatch = field.match(dayPattern);
            if (dayMatch) {
                const dayIndex = parseInt(dayMatch[1]);
                days[dayIndex] = {
                    day: parseInt(body[field]),
                    activities: []
                };
            }
        });

        // Add activities to each day
        fields.forEach(field => {
            const activityMatch = field.match(activityPattern);
            if (activityMatch) {
                const [_, dayIndex, activityIndex, fieldType] = activityMatch;
                const dayIndexNum = parseInt(dayIndex);
                const activityIndexNum = parseInt(activityIndex);

                if (!days[dayIndexNum].activities[activityIndexNum]) {
                    days[dayIndexNum].activities[activityIndexNum] = {};
                }
                days[dayIndexNum].activities[activityIndexNum][fieldType] = body[field];
            }
        });

        // Convert days object to array
        Object.keys(days).forEach(dayIndex => {
            itinerary.push(days[dayIndex]);
        });

        return itinerary;
    } catch (error) {
        console.error('Error parsing itinerary data:', error);
        throw error;
    }
};

// Create a new workshop (Admin only)
exports.createWorkshop = async (req, res) => {
    try {
        const workshopData = {
            ...req.body
        };

        // Process all images in parallel
        const processImages = async () => {
            const imagePromises = [];

            // Handle banner upload
            if (req.body.banner) {
                imagePromises.push(
                    compressBase64Image(req.body.banner)
                        .then(compressedImage => mediaController.uploadToImageKit(compressedImage))
                        .then(upload => {
                            workshopData.media = {
                                ...workshopData.media,
                                banner: upload
                            };
                        })
                        .catch(error => {
                            console.error('Error processing banner:', error);
                            throw error;
                        })
                );
            }

            // Handle gallery uploads
            if (req.body.gallery && Array.isArray(req.body.gallery)) {
                imagePromises.push(
                    Promise.all(
                        req.body.gallery.map(async (imageData) => {
                            const compressedImage = await compressBase64Image(imageData.image);
                            const upload = await mediaController.uploadToImageKit(compressedImage);
                            return {
                                ...upload,
                                type: 'image',
                                description: imageData.description || ''
                            };
                        })
                    )
                    .then(uploads => {
                        workshopData.media = {
                            ...workshopData.media,
                            gallery: uploads
                        };
                    })
                    .catch(error => {
                        console.error('Error processing gallery:', error);
                        throw error;
                    })
                );
            }

            // Handle itinerary activity images
            if (req.body.itinerary && Array.isArray(req.body.itinerary)) {
                imagePromises.push(
                    Promise.all(
                        req.body.itinerary.map(async (day) => {
                            // Process itinerary banner
                            if (day.itineraryBanner) {
                                const compressedBanner = await compressBase64Image(day.itineraryBanner);
                                const bannerUpload = await mediaController.uploadToImageKit(compressedBanner);
                                day.itineraryBanner = {
                                    url: bannerUpload.url,
                                    fileId: bannerUpload.fileId
                                };
                            }

                            // Process activity images
                            if (day.activities && Array.isArray(day.activities)) {
                                await Promise.all(
                                    day.activities.map(async (activity) => {
                                        if (activity.image) {
                                            const compressedImage = await compressBase64Image(activity.image);
                                            const upload = await mediaController.uploadToImageKit(compressedImage);
                                            activity.image = {
                                                url: upload.url,
                                                fileId: upload.fileId
                                            };
                                        }
                                    })
                                );
                            }
                            return day;
                        })
                    )
                    .catch(error => {
                        console.error('Error processing itinerary images:', error);
                        throw error;
                    })
                );
            }

            return Promise.all(imagePromises);
        };

        // Process all images first
        await processImages();

        // Create workshop after all images are processed
        const workshop = new Workshop(workshopData);
        await workshop.save();
        
        res.status(201).json({
            success: true,
            data: workshop
        });
    } catch (error) {
        console.error('Workshop creation error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Invalid input'
        });
    }
};

// Get all workshops (Public)
exports.getAllWorkshops = async (req, res) => {
    try {
        const workshops = await Workshop.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: workshops.length,
            data: workshops
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single workshop (Public)
exports.getWorkshop = async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        if (!workshop) {
            return res.status(404).json({
                success: false,
                error: 'Workshop not found'
            });
        }
        res.status(200).json({
            success: true,
            data: workshop
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update workshop (Admin only)
exports.updateWorkshop = async (req, res) => {
    try {
        const workshopData = { ...req.body };
        const workshop = await Workshop.findById(req.params.id);

        if (!workshop) {
            return res.status(404).json({
                success: false,
                error: 'Workshop not found'
            });
        }

        // Helper function to delete image from ImageKit
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

        // Process all images in parallel
        const processImages = async () => {
            const imagePromises = [];

            // Handle banner update
            if (req.body.banner) {
                // Delete old banner if exists
                if (workshop.media?.banner?.fileId) {
                    await deleteImageFromImageKit(workshop.media.banner);
                }
                imagePromises.push(
                    compressBase64Image(req.body.banner)
                        .then(compressedImage => mediaController.uploadToImageKit(compressedImage))
                        .then(upload => {
                            workshopData.media = {
                                ...workshopData.media,
                                banner: upload
                            };
                        })
                );
            }

            // Handle gallery updates
            if (req.body.gallery && Array.isArray(req.body.gallery)) {
                // Delete old gallery images
                if (workshop.media?.gallery) {
                    await Promise.all(
                        workshop.media.gallery.map(file => deleteImageFromImageKit(file))
                    );
                }

                imagePromises.push(
                    Promise.all(
                        req.body.gallery.map(async (imageData) => {
                            const compressedImage = await compressBase64Image(imageData.image);
                            const upload = await mediaController.uploadToImageKit(compressedImage);
                            return {
                                ...upload,
                                type: 'image',
                                description: imageData.description || ''
                            };
                        })
                    )
                    .then(uploads => {
                        workshopData.media = {
                            ...workshopData.media,
                            gallery: uploads
                        };
                    })
                );
            }

            // Handle itinerary updates
            if (req.body.itinerary && Array.isArray(req.body.itinerary)) {
                // Delete old itinerary images
                if (workshop.itinerary) {
                    for (const day of workshop.itinerary) {
                        // Delete itinerary banner
                        if (day.itineraryBanner?.fileId) {
                            await deleteImageFromImageKit(day.itineraryBanner);
                        }

                        // Delete activity images
                        if (day.activities) {
                            for (const activity of day.activities) {
                                if (activity.image?.fileId) {
                                    await deleteImageFromImageKit(activity.image);
                                }
                            }
                        }
                    }
                }

                // Process new itinerary images
                imagePromises.push(
                    Promise.all(
                        req.body.itinerary.map(async (day) => {
                            const processedDay = { ...day };

                            // Process itinerary banner
                            if (day.itineraryBanner) {
                                const compressedBanner = await compressBase64Image(day.itineraryBanner);
                                const bannerUpload = await mediaController.uploadToImageKit(compressedBanner);
                                processedDay.itineraryBanner = {
                                    url: bannerUpload.url,
                                    fileId: bannerUpload.fileId
                                };
                            }

                            // Process activity images
                            if (day.activities && Array.isArray(day.activities)) {
                                processedDay.activities = await Promise.all(
                                    day.activities.map(async (activity) => {
                                        const processedActivity = { ...activity };
                                        if (activity.image) {
                                            const compressedImage = await compressBase64Image(activity.image);
                                            const upload = await mediaController.uploadToImageKit(compressedImage);
                                            processedActivity.image = {
                                                url: upload.url,
                                                fileId: upload.fileId
                                            };
                                        }
                                        return processedActivity;
                                    })
                                );
                            }

                            return processedDay;
                        })
                    )
                    .then(processedItinerary => {
                        workshopData.itinerary = processedItinerary;
                    })
                );
            }

            return Promise.all(imagePromises);
        };

        // Process all images first
        await processImages();

        // Update workshop after all images are processed
        const updatedWorkshop = await Workshop.findByIdAndUpdate(
            req.params.id,
            workshopData,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            data: updatedWorkshop
        });
    } catch (error) {
        console.error('Workshop update error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Invalid input'
        });
    }
};

// Delete workshop (Admin only)
exports.deleteWorkshop = async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id);
        
        if (!workshop) {
            return res.status(404).json({
                success: false,
                error: 'Workshop not found'
            });
        }

        console.log('Starting workshop deletion process for:', workshop._id);

        // Delete all media files from ImageKit
        try {
            if (workshop.media) {
                // Delete banner
                if (workshop.media.banner?.fileId) {
                    try {
                        await mediaController.deleteFromImageKit(workshop.media.banner.fileId);
                        console.log('Successfully deleted banner:', workshop.media.banner.fileId);
                    } catch (error) {
                        console.log('Error deleting banner:', error.message);
                    }
                }

                // Delete gallery files
                if (workshop.media.gallery) {
                    await Promise.all(
                        workshop.media.gallery.map(async file => {
                            if (file.fileId) {
                                try {
                                    await mediaController.deleteFromImageKit(file.fileId);
                                    console.log('Successfully deleted gallery file:', file.fileId);
                                } catch (error) {
                                    console.log('Error deleting gallery file:', error.message);
                                }
                            }
                        })
                    );
                }
            }

            // Delete itinerary banner and activity images
            if (workshop.itinerary && Array.isArray(workshop.itinerary)) {
                console.log('Processing itinerary deletion...');
                
                for (const day of workshop.itinerary) {
                    console.log('Processing day:', day.day);
                    
                    // Delete itinerary banner
                    if (day.itineraryBanner?.fileId) {
                        try {
                            console.log('Found itinerary banner fileId:', day.itineraryBanner.fileId);
                            await mediaController.deleteFromImageKit(day.itineraryBanner.fileId);
                            console.log('Successfully deleted itinerary banner:', day.itineraryBanner.fileId);
                        } catch (error) {
                            console.log('Error deleting itinerary banner:', error.message);
                        }
                    }

                    // Delete activity images
                    if (day.activities && Array.isArray(day.activities)) {
                        console.log('Processing activities for day:', day.day);
                        
                        for (const activity of day.activities) {
                            if (activity.image?.fileId) {
                                try {
                                    console.log('Found activity image fileId:', activity.image.fileId);
                                    await mediaController.deleteFromImageKit(activity.image.fileId);
                                    console.log('Successfully deleted activity image:', activity.image.fileId);
                                } catch (error) {
                                    console.log('Error deleting activity image:', error.message);
                                }
                            }
                        }
                    }
                }
            } else {
                console.log('No itinerary found or itinerary is not an array');
            }
        } catch (mediaError) {
            console.log('Error during media cleanup:', mediaError.message);
            // Continue with workshop deletion even if media cleanup fails
        }

        // Delete the workshop document
        await Workshop.findByIdAndDelete(req.params.id);
        console.log('Workshop document deleted successfully');
        
        res.status(200).json({
            success: true,
            data: {},
            message: 'Workshop deleted successfully'
        });
    } catch (error) {
        console.log('Error in deleteWorkshop:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete media from workshop (Admin only)
exports.deleteWorkshopMedia = async (req, res) => {
    try {
        const { workshopId, fileId, type } = req.params;
        const workshop = await Workshop.findById(workshopId);

        if (!workshop) {
            return res.status(404).json({
                success: false,
                error: 'Workshop not found'
            });
        }

        // Delete file from ImageKit
        await mediaController.deleteFromImageKit(fileId);

        // Update workshop document
        if (type === 'banner') {
            workshop.media.banner = undefined;
        } else if (type === 'gallery') {
            workshop.media.gallery = workshop.media.gallery.filter(
                file => file.fileId !== fileId
            );
        } else if (type === 'activity') {
            // Find and remove activity image
            workshop.itinerary.forEach(day => {
                day.activities.forEach(activity => {
                    if (activity.image?.fileId === fileId) {
                        activity.image = undefined;
                    }
                });
            });
        }

        await workshop.save();
        res.status(200).json({
            success: true,
            data: workshop
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 