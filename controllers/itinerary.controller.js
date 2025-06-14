const Itinerary = require('../models/itinerary.model');
const mediaController = require('./media.controller');

// Create a new itinerary
exports.createItinerary = async (req, res) => {
    try {
        const { day, activities } = req.body;

        // Process activity images if present
        const processedActivities = await Promise.all(activities.map(async (activity, index) => {
            const processedActivity = { ...activity };
            
            // Handle image upload if present in files
            if (req.files && req.files[`activities[${index}].image`]) {
                const imageFile = req.files[`activities[${index}].image`][0];
                const upload = await mediaController.uploadToImageKit(imageFile);
                processedActivity.image = upload;
            }
            
            return processedActivity;
        }));

        const itinerary = new Itinerary({
            day,
            activities: processedActivities
        });

        await itinerary.save();

        res.status(201).json({
            success: true,
            data: itinerary
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Get all itineraries
exports.getAllItineraries = async (req, res) => {
    try {
        const itineraries = await Itinerary.find().sort({ day: 1 });
        res.status(200).json({
            success: true,
            count: itineraries.length,
            data: itineraries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get single itinerary
exports.getItinerary = async (req, res) => {
    try {
        const itinerary = await Itinerary.findById(req.params.id);
        if (!itinerary) {
            return res.status(404).json({
                success: false,
                error: 'Itinerary not found'
            });
        }
        res.status(200).json({
            success: true,
            data: itinerary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update itinerary
exports.updateItinerary = async (req, res) => {
    try {
        const { day, activities } = req.body;
        const itinerary = await Itinerary.findById(req.params.id);

        if (!itinerary) {
            return res.status(404).json({
                success: false,
                error: 'Itinerary not found'
            });
        }

        // Process activity images if present
        const processedActivities = await Promise.all(activities.map(async (activity, index) => {
            const processedActivity = { ...activity };
            
            // Handle image upload if present in files
            if (req.files && req.files[`activities[${index}].image`]) {
                const imageFile = req.files[`activities[${index}].image`][0];
                const upload = await mediaController.uploadToImageKit(imageFile);
                processedActivity.image = upload;
            }
            
            return processedActivity;
        }));

        itinerary.day = day;
        itinerary.activities = processedActivities;

        await itinerary.save();

        res.status(200).json({
            success: true,
            data: itinerary
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Delete itinerary
exports.deleteItinerary = async (req, res) => {
    try {
        const itinerary = await Itinerary.findById(req.params.id);

        if (!itinerary) {
            return res.status(404).json({
                success: false,
                error: 'Itinerary not found'
            });
        }

        // Delete associated images from ImageKit
        for (const activity of itinerary.activities) {
            if (activity.image && activity.image.fileId) {
                await mediaController.deleteFromImageKit(activity.image.fileId);
            }
        }

        await itinerary.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 