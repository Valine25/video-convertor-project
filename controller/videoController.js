const Video = require("../models/video");
const { exec } = require("child_process");

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Save initial video record
    const newVideo = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "processing"
    });

    const savedVideo = await newVideo.save();

    // Call Python AI script
    
    exec(
  `python ai-engine/preprocess.py uploads/${req.file.filename}`,
  async (error, stdout, stderr) => {

    if (error) {
      console.error("Python error:", error);
      return;
    }

    const transcript = stdout;

    await Video.findByIdAndUpdate(savedVideo._id, {
      transcript: transcript,
      status: "processed"
    });

    console.log("Preprocessing completed");

  }
);

    res.status(201).json({
      message: "Video uploaded and processing started",
      videoId: savedVideo._id
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};