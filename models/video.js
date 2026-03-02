const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema({
  start: Number,
  end: Number
});

const videoSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  status: {
    type: String,
    default: "uploaded"
  },
  transcript: String,
  highlights: [highlightSchema],
  hashtags: [String],
  score: Number
}, { timestamps: true });

module.exports = mongoose.model("Video", videoSchema);