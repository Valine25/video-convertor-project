const Video = require("../models/video");
const { exec } = require("child_process");

exports.uploadVideo = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Save initial record
    const newVideo = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "processing"
    });

    const savedVideo = await newVideo.save();

    // Step 1: Run preprocessing
    exec(
      `python ai-engine/preprocess.py "uploads/${req.file.filename}"`,
      async (error, stdout, stderr) => {

        if (error) {
          console.error("Python error:", error);
          return;
        }

        const transcript = stdout;

        await Video.findByIdAndUpdate(savedVideo._id, {
          transcript: transcript
        });

        console.log("Preprocessing completed");

        // Step 2: Run highlight detection AFTER preprocessing
        exec(
          `python ai-engine/highlight_detector.py "uploads/${req.file.filename}"`,
          async (error, stdout, stderr) => {

            if (error) {
              console.error("Python error:", error);
              return;
            }

            const result = JSON.parse(stdout);

            await Video.findByIdAndUpdate(savedVideo._id, {
              highlights: result.highlights,
              status: "processed"
            });

            console.log("Highlight detection completed");
          }
        );

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