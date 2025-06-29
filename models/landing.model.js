const mongoose = require('mongoose');

const landingSchema = new mongoose.Schema({
  hero: {
    backgroundImageOrVideo: {
      url: { type: String },
      fileId: { type: String }
    }, // URL or media reference
    headline: { type: String },
    subheadline: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    badgeImageOrVideo: {
      url: { type: String },
      fileId: { type: String }
    }
  },
  agencySection: {
    title: { type: String },
    description: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    imageOrVideo: {
      url: { type: String },
      fileId: { type: String }
    } // background/banner image
  },
  footer: {
    logoOrVideo: {
      url: { type: String },
      fileId: { type: String }
    },
    description: { type: String },
    links: [
      {
        label: { type: String },
        url: { type: String }
      }
    ],
    socialLinks: [
      {
        platform: { type: String },
        url: { type: String }
      }
    ],
    copyright: { type: String }
  },
  lastUpdated: { type: Date, default: Date.now }
});

const Landing = mongoose.model('Landing', landingSchema);

module.exports = Landing;