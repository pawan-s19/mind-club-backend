const mongoose = require('mongoose');


const workshopSchema = new mongoose.Schema({
    header: {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        image: {
            url: String,
            fileId: { type: String, select: false }
        },
        watchTrailer: {
            url: String,
            fileId: { type: String, select: false }
        }
    },
    brochure:{
        url: String,
        fileId: { type: String, select: false }
    },
    workshopType: {
        type: String,
        enum: ['online', 'on field'],
        required: true
    },
    about: {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        workshopVisual: [{
            name: String,
            imageOrVideo: {
            url: String,
            fileId: { type: String, select: false }
            }
        }]
    },
    location: {
        name: String,
        description: String,
        locationBlog:[{
            name: String,
            description: String,
            imageOrVideo: {
                url: String,
                fileId: { type: String, select: false }
            }
        }],
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
            fileId: { type: String, select: false }
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        activities: [{
            time: String,
            activity: String,
            image: {
                imageOrVideo: {
                    url: String,
                    fileId: { type: String, select: false }
                },
                description: String
            },
            color: {
                type: String,
                required: true
            }
        }]
    }],
    // elegablePersonSkills: [{
    //     type: String,
    // }],
    // mainHeading: {
    //     type: String,
    //     required: true
    // },
    // inclusions: [{
    //     type: String
    // }],
    // exclusions: [{
    //     type: String
    // }],
    // priceBreakdown: {
    //     type: String,
    //     required: true
    // },
    // referenceMember: {
    //     type: String,
    //     required: true
    // },
    // previousWorkshopGlimpses: [{
    //     imageUrl: String,
    //     description: String
    // }],
    
}, {
    timestamps: true
});

module.exports = mongoose.model('Workshop', workshopSchema); 