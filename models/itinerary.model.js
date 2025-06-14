const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true
    },
    activities: [{
        time: {
            type: String,
            required: true
        },
        activity: {
            type: String,
            required: true
        },
        image: {
            url: String,
            fileId: String
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Itinerary', itinerarySchema); 