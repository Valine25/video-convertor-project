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

       generatedReel: String,

    platformReel: String,

    thumbnail: String,

    captions: [String],

    hashtags: [String],

    viralityScore: Number,

    userId: String,
  },

  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);


