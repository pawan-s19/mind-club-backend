const mongoose = require("mongoose");

const onlineWorkshopSchema = new mongoose.Schema(
  {
    // 🔹 SECTION 1: Header (Hero Section)
    workshopHeader: {
      thumbnail: {
        url: { type: String, trim: true },
        fileId: { type: String, select: false },
      },
      workshopType: {
        type: String,
        required: true,
        default: "online",
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
        default: "INR",
        trim: true,
      },
    },

    // 🔹 SECTION 3: Workshop Highlights
    workshopHighlights: {
      mode: {
        type: String,
        enum: ["online"],
        default: "online",
        required: true,
      },
      certificateProvided: {
        type: Boolean,
        default: true,
      },
      duration: {
        type: String,
        required: true,
        trim: true,
      },
      spots: {
        type: String,
        enum: ["Limited", "Unlimited", "10-20", "20-30", "30-50"],
        default: "Limited",
      },
    },

    // 🔹 SECTION 4: About Workshop
    aboutWorkshop: {
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // 🔹 SECTION 5: Mentor's Work (Projects)
    projects: {
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
      items: [
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
    },

    // 🔹 SECTION 6: What You'll Learn (Topics)
    topics: {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      subtitle: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      learnings: {
        type: [String],
        default: [],
      },
    },

    // 🔹 SECTION 7: Mentor Information
    aboutMentors: {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      subtitle: {
        type: String,
        required: true,
        trim: true,
      },
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
          socialLinks: [
            {
              platform: { type: String },
              url: { type: String },
            },
          ],
        },
      ],
    },

    meetingLink: {
      type: String,
      trim: true,
      required: true,
    },
    meetingPassword: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OnlineWorkshop", onlineWorkshopSchema);
