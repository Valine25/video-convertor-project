const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    filename: String,

    originalName: String,

    status: {
      type: String,
      default: "uploaded",
    },

    transcript: String,

    highlights: [
      {
        start: Number,
        end: Number,
      },
    ],

    // MAIN GENERATED REEL
    generatedReel: String,

    // 9:16 VERSION
    platformReel: String,

    // AI THUMBNAIL
    thumbnail: String,

    // CAPTIONS
    captions: String,

    // HASHTAGS
    hashtags: [String],

    // SCORE
    viralityScore: Number,

    // USER
    userId: String,
  },

  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);