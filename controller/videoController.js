const Video = require("../models/video");

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const newVideo = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "uploaded"
    });

    const savedVideo = await newVideo.save();

    res.status(201).json({
      message: "Video uploaded successfully",
      video: savedVideo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};