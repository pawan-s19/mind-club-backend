const Workshop = require('../models/workshop.model');
const mediaController = require('./media.controller');
const sharp = require('sharp');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

// Helper function to compress image
// const compressImage = async (file) => {
//     try {
//         // If not an image, return as is
//         if (!file.mimetype.startsWith('image/')) {
//             return file;
//         }

//         // Check if file has buffer
//         if (!file.buffer) {
//             console.error('No buffer found in file:', file.originalname);
//             return file;
//         }

//         // Process image with sharp
//         const compressedBuffer = await sharp(file.buffer)
//             .resize(1920, 1080, {
//                 fit: 'inside',
//                 withoutEnlargement: true
//             })
//             .jpeg({ 
//                 quality: 80,
//                 progressive: true
//             })
//             .toBuffer();

//         return {
//             ...file,
//             buffer: compressedBuffer,
//             size: compressedBuffer.length
//         };
//     } catch (error) {
//         console.error('Error compressing image:', error);
//         // If compression fails, return original file
//         return file;
//     }
// };

// Helper function to process files in batches
// const processFilesInBatches = async (files, batchSize = 3) => {
//     try {
//         const results = [];
//         for (let i = 0; i < files.length; i += batchSize) {
//             const batch = files.slice(i, i + batchSize);
//             const batchResults = await Promise.all(
//                 batch.map(file => compressImage(file))
//             );
//             results.push(...batchResults);
//         }
//         return results;
//     } catch (error) {
//         console.error('Error processing files in batches:', error);
//         throw error;
//     }
// };

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
        // Throw a more descriptive error to stop the process and provide better feedback
        throw new Error('Image compression failed. The provided image data may be corrupt or incomplete.');
    }
};

// Helper function to parse itinerary data
// const parseItineraryData = (body) => {
//     try {
//         const itinerary = [];
//         const dayPattern = /itinerary\[(\d+)\]\[day\]/;
//         const activityPattern = /itinerary\[(\d+)\]\[activities\]\[(\d+)\]\[(time|activity)\]/;

//         // Get all form fields
//         const fields = Object.keys(body);
        
//         // Group fields by day
//         const days = {};
//         fields.forEach(field => {
//             const dayMatch = field.match(dayPattern);
//             if (dayMatch) {
//                 const dayIndex = parseInt(dayMatch[1]);
//                 days[dayIndex] = {
//                     day: parseInt(body[field]),
//                     activities: []
//                 };
//             }
//         });

//         // Add activities to each day
//         fields.forEach(field => {
//             const activityMatch = field.match(activityPattern);
//             if (activityMatch) {
//                 const [_, dayIndex, activityIndex, fieldType] = activityMatch;
//                 const dayIndexNum = parseInt(dayIndex);
//                 const activityIndexNum = parseInt(activityIndex);

//                 if (!days[dayIndexNum].activities[activityIndexNum]) {
//                     days[dayIndexNum].activities[activityIndexNum] = {};
//                 }
//                 days[dayIndexNum].activities[activityIndexNum][fieldType] = body[field];
//             }
//         });

//         // Convert days object to array
//         Object.keys(days).forEach(dayIndex => {
//             itinerary.push(days[dayIndex]);
//         });

//         return itinerary;
//     } catch (error) {
//         console.error('Error parsing itinerary data:', error);
//         throw error;
//     }
// };

// Helper function to upload any base64 media, compressing only if it's an image
const uploadBase64Media = async (base64String) => {
    try {
        // Ensure we have a valid base64 string
        if (typeof base64String !== 'string' || !base64String.startsWith('data:')) {
            console.log('Skipping upload - not a base64 string:', typeof base64String);
            return base64String;
        }

        console.log('Processing base64 media for upload...');
        console.log('Media type detected:', base64String.substring(0, 50) + '...');
        
        let mediaToUpload = base64String;

        // Only compress if it's a new base64 image string
        if (base64String.startsWith('data:image')) {
            console.log('Compressing image before upload...');
            mediaToUpload = await compressBase64Image(base64String);
            console.log('Image compression completed');
        } else if (base64String.startsWith('data:application/')) {
            console.log('Document detected (PDF, DOC, etc.), skipping compression');
        } else if (base64String.startsWith('data:video/')) {
            console.log('Video detected, skipping compression');
        } else {
            console.log('Other media type detected, skipping compression');
        }
        
        console.log('Uploading to ImageKit...');
        console.log('Media length:', mediaToUpload.length);
        
        // Pass the full data URI, as the media controller is designed to handle it.
        const result = await mediaController.uploadToImageKit(mediaToUpload);
        console.log('Upload successful:', result.url);
        return result;
    } catch (error) {
        console.error('Error in uploadBase64Media:', error.message);
        console.error('Error details:', error);
        throw error;
    }
};

// Recursive helper to process all image uploads within the workshop data
const processWorkshopImages = async (data) => {
    console.log('Starting workshop image processing...');
    const processedData = JSON.parse(JSON.stringify(data)); // Deep copy

    // A nested helper to check and upload if the field is a base64 string
    const processField = async (fieldValue) => {
        // Handle object with url property (like {url: "data:..."})
        if (typeof fieldValue === 'object' && fieldValue !== null && fieldValue.url) {
            console.log('Found object with url property, processing url...');
            const urlResult = await processField(fieldValue.url);
            return {
                ...fieldValue,
                url: urlResult.url || urlResult,
                fileId: urlResult.fileId
            };
        }
        
        // Handle direct base64 string
        if (typeof fieldValue === 'string' && fieldValue.startsWith('data:')) {
            console.log('Found base64 field, processing upload...');
            console.log('Field type:', fieldValue.substring(0, 30) + '...');
            try {
                const result = await uploadBase64Media(fieldValue);
                console.log('Field processed successfully');
                return result;
            } catch (error) {
                console.error('Failed to process field:', error.message);
                console.error('Field value preview:', fieldValue.substring(0, 100) + '...');
                throw error;
            }
        }
        return fieldValue; // Return as-is if not a new base64 upload
    };

    try {
        if (processedData.header) {
            console.log('Processing header images...');
            if (processedData.header.image) {
                processedData.header.image = await processField(processedData.header.image);
            }
            if (processedData.header.watchTrailer) {
                processedData.header.watchTrailer = await processField(processedData.header.watchTrailer);
            }
        }
        
        if (processedData.brochure) {
            console.log('Processing brochure...');
            console.log('Brochure type:', typeof processedData.brochure);
            console.log('Brochure value:', JSON.stringify(processedData.brochure).substring(0, 100) + '...');
            processedData.brochure = await processField(processedData.brochure);
            console.log('Brochure processing completed');
            console.log('Final brochure result:', JSON.stringify(processedData.brochure).substring(0, 100) + '...');
        }
        
        if (processedData.thumbnail) {
            console.log('Processing thumbnail...');
            processedData.thumbnail = await processField(processedData.thumbnail);
        }
        
        if (processedData.about?.workshopVisual) {
            console.log('Processing workshop visual images...');
            processedData.about.workshopVisual = await Promise.all(
                processedData.about.workshopVisual.map(async (item) => ({
                    ...item,
                    imageOrVideo: await processField(item.imageOrVideo),
                }))
            );
        }
        
        if (processedData.location?.locationBlog) {
            console.log('Processing location blog images...');
            processedData.location.locationBlog = await Promise.all(
                processedData.location.locationBlog.map(async (item) => ({
                    ...item,
                    imageOrVideo: await processField(item.imageOrVideo),
                }))
            );
        }
        
        if (processedData.itinerary) {
            console.log('Processing itinerary images...');
            if (processedData.itinerary.itineraryDays) {
                processedData.itinerary.itineraryDays = await Promise.all(
                    processedData.itinerary.itineraryDays.map(async (day) => {
                        if (day.activities) {
                            day.activities = await Promise.all(
                                day.activities.map(async (activity) => {
                                    if (activity.imageOrVideo) {
                                        activity.imageOrVideo = await processField(activity.imageOrVideo);
                                    }
                                    return activity;
                                })
                            );
                        }
                        return day;
                    })
                );
            }
        }
        
        if (processedData.creators?.imageOrVideo) {
            console.log('Processing creators media...');
            processedData.creators.imageOrVideo = await Promise.all(
                processedData.creators.imageOrVideo.map(async (media) => await processField(media))
            );
        }
        
        if (processedData.mentor?.mentorImage) {
            console.log('Processing mentor image...');
            processedData.mentor.mentorImage = await processField(processedData.mentor.mentorImage);
        }

        console.log('Workshop image processing completed successfully');
        return processedData;
    } catch (error) {
        console.error('Error in processWorkshopImages:', error.message);
        throw error;
    }
};

exports.createWorkshop = async (req, res) => {
    try {
        // Process all images and get back data with URLs and fileIds
        const workshopData = await processWorkshopImages(req.body);

        const workshop = new Workshop(workshopData);
        await workshop.save();

        // Fetch all workshops to return in the response
        // const allWorkshops = await Workshop.find({}).sort({ createdAt: -1 }).lean();

        res.status(201).json({
            success: true,
            message: 'Workshop created successfully.',
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
        // Optional: Add query filters in the future like status, type, date range, etc.
        const workshops = await Workshop.find({})
            .sort({ createdAt: -1 })
            .lean(); // Converts Mongoose docs to plain JS objects for faster reads

        res.status(200).json({
            success: true,
            count: workshops.length,
            data: workshops
        });
    } catch (error) {
        console.error('Error fetching workshops:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Get single workshop (Public)
exports.getWorkshop = async (req, res) => {
    try {
        const workshop = await Workshop.findById(req.params.id).lean();

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
        console.error('Error fetching workshop:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

exports.updateWorkshop = async (req, res) => {
    try {
        const workshopToUpdate = await Workshop.findById(req.params.id);
        if (!workshopToUpdate) {
            return res.status(404).json({ success: false, error: 'Workshop not found' });
        }

        // --- Collect File IDs of all old images for potential deletion ---
        const oldFileIds = [];
        const collectFileIds = (obj) => {
            
            if (obj && obj.fileId) oldFileIds.push(obj.fileId);
            if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(collectFileIds);
            }
        };
        collectFileIds(workshopToUpdate.toJSON());
        
        // --- Process incoming data, uploading any new base64 images ---
        const workshopData = await processWorkshopImages(req.body);

        // --- Update workshop in DB ---
        const updatedWorkshop = await Workshop.findByIdAndUpdate(
            req.params.id,
            workshopData,
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
        collectNewFileIds(updatedWorkshop.toJSON());

        const fileIdsToDelete = oldFileIds.filter(id => !newFileIds.has(id));

        if (fileIdsToDelete.length > 0) {
            console.log(`Deleting ${fileIdsToDelete.length} old files from ImageKit...`);
            await Promise.all(fileIdsToDelete.map(id => 
                mediaController.deleteFromImageKit(id).catch(err => 
                    console.warn(`Failed to delete old file ${id} from ImageKit:`, err.message)
                )
            ));
        }

        // Fetch all workshops to return in the response
        // const allWorkshops = await Workshop.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            message: 'Workshop updated successfully.',
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
            return res.status(404).json({ success: false, error: 'Workshop not found' });
        }

        // --- Collect all fileIds and prepare response data before deletion ---
        const fileIdsToDelete = [];
        const collectFileIds = (obj) => {
            if (obj && obj.fileId) fileIdsToDelete.push(obj.fileId);
            if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(collectFileIds);
            }
        };
        const deletedWorkshopData = workshop.toJSON(); // Get a plain object copy
        collectFileIds(deletedWorkshopData);

        // --- Delete workshop document from DB first ---
        await Workshop.findByIdAndDelete(req.params.id);
        console.log('Workshop document deleted from database:', req.params.id);

        // --- Now, delete files from ImageKit ---
        if (fileIdsToDelete.length > 0) {
            console.log(`Deleting ${fileIdsToDelete.length} associated files from ImageKit...`);
            await Promise.all(fileIdsToDelete.map(id => 
                mediaController.deleteFromImageKit(id).catch(err => 
                    console.warn(`Failed to delete file ${id} from ImageKit:`, err.message)
                )
            ));
        }

        // Fetch all remaining workshops to return in the response
        const allWorkshops = await Workshop.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            message: 'Workshop and associated media deleted successfully',
            count: allWorkshops.length,
            data: allWorkshops
        });
    } catch (error) {
        console.error('Error in deleteWorkshop:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
