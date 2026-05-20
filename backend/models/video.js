const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  status: {
    type: String,
    default: "uploaded"
  },
  transcript: String,
  highlights: [
    {
      start: Number,
      end: Number
    }
  ],
  
  clips: [String],
  hashtags: [String],
  score: Number
}, { timestamps: true });

module.exports = mongoose.model("Video", videoSchema);