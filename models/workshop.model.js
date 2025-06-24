const { type } = require('express/lib/response');
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

    subHeroHeading : {
        type : String,
        required : true
    },
    skills:{
        headingOfSection : String,
        skills : [{
            type: String,
            required : true
        }]
    },
    creators : {
        name : String,
        description : String,
        imageOrVideo : [{
            url: String,
            fileId: { type: String, select: false }
        }]
    },
    mentor : {
        name : String,
        description : String,
        mentorName : String,
        about : String,
        mentorImage: {
            url: String,
            fileId: { type: String, select: false }
        }    
    },
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

// Utility to validate and structure workshop data according to the model
function structureWorkshopData(data) {
    // Ensure all required fields are present and correctly structured
    return {
        header: {
            title: data.header?.title || '',
            description: data.header?.description || '',
            image: data.header?.image || {},
            watchTrailer: data.header?.watchTrailer || {},
        },
        brochure: data.brochure || {},
        workshopType: data.workshopType,
        about: {
            title: data.about?.title || '',
            description: data.about?.description || '',
            workshopVisual: Array.isArray(data.about?.workshopVisual) ? data.about.workshopVisual : [],
        },
        location: {
            name: data.location?.name || '',
            description: data.location?.description || '',
            locationBlog: Array.isArray(data.location?.locationBlog) ? data.location.locationBlog : [],
        },
        startDate: data.startDate,
        endDate: data.endDate,
        itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
        subHeroHeading: data.subHeroHeading,
        skills: {
            name: data.skills?.name || '',
            skills: Array.isArray(data.skills?.skills) ? data.skills.skills : [],
        },
        creators: {
            name: data.creators?.name || '',
            description: data.creators?.description || '',
            imageOrVideo: Array.isArray(data.creators?.imageOrVideo) ? data.creators.imageOrVideo : [],
        },
        mentor: {
            name: data.mentor?.name || '',
            description: data.mentor?.description || '',
            mentorName: data.mentor?.mentorName || '',
            about: data.mentor?.about || '',
            mentorImage: data.mentor?.mentorImage || {},
        },
        elegablePersonSkills: Array.isArray(data.elegablePersonSkills) ? data.elegablePersonSkills : [],
        mainHeading: data.mainHeading,
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
        exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
        priceBreakdown: data.priceBreakdown,
        referenceMember: data.referenceMember,
        previousWorkshopGlimpses: Array.isArray(data.previousWorkshopGlimpses) ? data.previousWorkshopGlimpses : [],
    };
} 