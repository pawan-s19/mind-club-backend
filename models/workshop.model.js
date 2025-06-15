const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    workshopType: {
        type: String,
        enum: ['online', 'on field'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    itinerary: [{
        day: Number,
        itineraryBanner: {
            url: String,
            fileId: String
        },
        activities: [{
            time: String,
            activity: String,
            image: {
                url: String,
                fileId: String
            }
        }]
    }],
    mainHeading: {
        type: String,
        required: true
    },
    inclusions: [{
        type: String
    }],
    exclusions: [{
        type: String
    }],
    priceBreakdown: {
        type: String,
        required: true
    },
    referenceMember: {
        type: String,
        required: true
    },
    previousWorkshopGlimpses: [{
        imageUrl: String,
        description: String
    }],
    media: {
        banner: {
            url: String,
            fileId: String
        },
        gallery: [{
            url: String,
            fileId: String,
            type: {
                type: String,
                enum: ['image', 'video']
            },
            description: String
        }]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Workshop', workshopSchema); 