const mongoose = require('mongoose');

const onlineWorkshopSchema = new mongoose.Schema({

  // 🔹 SECTION 1: Header (Hero Section)
  workshopHeader: {
    thumbnail: {
      url: { type: String, trim: true },
      fileId: { type: String, select: false },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    coverImage: {
      url: { type: String, trim: true },
      fileId: { type: String, select: false },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },

  // 🔹 SECTION 2: Pricing
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    purchaseLink: {
      type: String,
      trim: true,
    },
  },

  // 🔹 SECTION 3: Workshop Highlights
  workshopHighlights: {
    mode: {
      type: String,
      enum: ['online'],
      default: 'online',
      required: true,
    },
    certificateProvided: {
      type: Boolean,
      default: true,
    },
    certificateDetails: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    spots: {
      type: String,
      enum: ['Limited', 'Unlimited', '10-20', '20-30', '30-50'],
      default: 'Limited',
    },
  },

  // 🔹 SECTION 4: About Workshop
  description: {
    type: String,
    required: true,
    trim: true,
  },

  // 🔹 SECTION 5: Mentor's Work (Projects)
  projects: [
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      subtitle: {
        type: String,
        trim: true,
      },
      image: {
        url: { type: String, trim: true },
        fileId: { type: String, select: false },
      },
      link: {
        type: String,
        trim: true,
      },
    },
  ],

  // 🔹 SECTION 6: What You'll Learn (Topics)
  learnings: {
    type: [String],
    default: [],
  },

  // 🔹 SECTION 7: Mentor Information
  mentors: [
    {
      name: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      about: {
        type: String,
        trim: true,
      },
      photo: {
        url: { type: String, trim: true },
        fileId: { type: String, select: false },
      },
      links: {
        instagram: { type: String, trim: true },
        youtube: { type: String, trim: true },
        linkedin: { type: String, trim: true },
      },
    },
  ],

  // 🔹 SECTION 8: Meeting Link (Zoom/Meet)
  meetingLink: {
    type: String,
    trim: true,
    required: true,
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model('OnlineWorkshop', onlineWorkshopSchema);
