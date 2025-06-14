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

// Helper function to parse itinerary data from form fields
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
        console.log('Files received:', req.files);
        
        // Parse itinerary data from form fields
        const itinerary = parseItineraryData(req.body);
        
        const workshopData = {
            ...req.body,
            itinerary
        };

        // Process all files in parallel with compression
        const processFiles = async () => {
            const filePromises = [];

            // Handle banner upload
            if (req.files && req.files.banner) {
                filePromises.push(
                    compressImage(req.files.banner[0])
                        .then(compressedFile => mediaController.uploadToImageKit(compressedFile))
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
            if (req.files && req.files.gallery) {
                filePromises.push(
                    processFilesInBatches(req.files.gallery)
                        .then(compressedFiles => 
                            Promise.all(
                                compressedFiles.map(async (file) => {
                                    const upload = await mediaController.uploadToImageKit(file);
                                    return {
                                        ...upload,
                                        type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                                        description: req.body.galleryDescriptions?.[file.originalname] || ''
                                    };
                                })
                            )
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
            if (req.files && req.files['itinerary.activities.image']) {
                filePromises.push(
                    processFilesInBatches(req.files['itinerary.activities.image'])
                        .then(compressedFiles =>
                            Promise.all(
                                compressedFiles.map(file => mediaController.uploadToImageKit(file))
                            )
                        )
                        .then(uploadedImages => {
                            if (workshopData.itinerary) {
                                workshopData.itinerary = workshopData.itinerary.map((day, dayIndex) => {
                                    if (day.activities) {
                                        day.activities = day.activities.map((activity, activityIndex) => {
                                            const imageIndex = dayIndex * day.activities.length + activityIndex;
                                            if (uploadedImages[imageIndex]) {
                                                activity.image = uploadedImages[imageIndex];
                                            }
                                            return activity;
                                        });
                                    }
                                    return day;
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Error processing itinerary images:', error);
                            throw error;
                        })
                );
            }

            return Promise.all(filePromises);
        };

        // Process all files first
        await processFiles();

        // Create workshop after all files are processed
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

        // Handle banner update
        if (req.files && req.files.banner) {
            // Delete old banner if exists
            if (workshop.media?.banner?.fileId) {
                await mediaController.deleteFromImageKit(workshop.media.banner.fileId);
            }
            const bannerUpload = await mediaController.uploadToImageKit(req.files.banner[0]);
            workshopData.media = {
                ...workshopData.media,
                banner: bannerUpload
            };
        }

        // Handle gallery updates
        if (req.files && req.files.gallery) {
            const galleryUploads = await Promise.all(
                req.files.gallery.map(async (file) => {
                    const upload = await mediaController.uploadToImageKit(file);
                    return {
                        ...upload,
                        type: file.mimetype.startsWith('image/') ? 'image' : 'video',
                        description: req.body.galleryDescriptions?.[file.originalname] || ''
                    };
                })
            );
            workshopData.media = {
                ...workshopData.media,
                gallery: [...(workshop.media?.gallery || []), ...galleryUploads]
            };
        }

        // Handle itinerary activity images update
        if (req.files && req.files['itinerary.activities.image']) {
            const activityImages = req.files['itinerary.activities.image'];
            const uploadedImages = await Promise.all(
                activityImages.map(async (file) => {
                    const upload = await mediaController.uploadToImageKit(file);
                    return {
                        url: upload.url,
                        fileId: upload.fileId
                    };
                })
            );

            // Update itinerary with uploaded images
            if (workshopData.itinerary) {
                workshopData.itinerary = workshopData.itinerary.map((day, dayIndex) => {
                    if (day.activities) {
                        day.activities = day.activities.map((activity, activityIndex) => {
                            const imageIndex = dayIndex * day.activities.length + activityIndex;
                            if (uploadedImages[imageIndex]) {
                                // Delete old image if exists
                                if (activity.image?.fileId) {
                                    mediaController.deleteFromImageKit(activity.image.fileId);
                                }
                                activity.image = uploadedImages[imageIndex];
                            }
                            return activity;
                        });
                    }
                    return day;
                });
            }
        }

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
        res.status(400).json({
            success: false,
            error: error.message
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

        // Delete all media files from ImageKit
        try {
            if (workshop.media) {
                // Delete banner
                if (workshop.media.banner?.fileId) {
                    try {
                        await mediaController.deleteFromImageKit(workshop.media.banner.fileId);
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
                                } catch (error) {
                                    console.log('Error deleting gallery file:', error.message);
                                }
                            }
                        })
                    );
                }
            }

            // Delete itinerary activity images
            if (workshop.itinerary) {
                await Promise.all(
                    workshop.itinerary.flatMap(day => 
                        day.activities.map(async activity => {
                            if (activity.image?.fileId) {
                                try {
                                    await mediaController.deleteFromImageKit(activity.image.fileId);
                                } catch (error) {
                                    console.log('Error deleting activity image:', error.message);
                                }
                            }
                        })
                    )
                );
            }
        } catch (mediaError) {
            console.log('Error during media cleanup:', mediaError.message);
            // Continue with workshop deletion even if media cleanup fails
        }

        // Delete the workshop document
        await Workshop.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            data: {},
            message: 'Workshop deleted successfully'
        });
    } catch (error) {
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