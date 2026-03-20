const Video = require("../models/video");
const { exec, spawn } = require("child_process");

// -------------------------
// Upload Controller
// -------------------------
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("Video uploaded:", req.file.filename);

    const newVideo = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "preprocessing"
    });

    const savedVideo = await newVideo.save();

    // -------------------------
    // STEP 1: Preprocessing
    // -------------------------
    exec(
      `python ai-engine/preprocess.py "uploads/${req.file.filename}"`,
      async (error, stdout, stderr) => {

        console.log("Running preprocessing...");

        if (error) {
          console.error("Preprocess error:", error);
          return;
        }

        console.log("Preprocessing output:", stdout);

        const transcript = stdout;

        await Video.findByIdAndUpdate(savedVideo._id, {
          transcript: transcript,
          status: "detecting_highlights"
        });

        console.log("Transcript saved");

        // -------------------------
        // STEP 2: Highlight Detection
        // -------------------------
        exec(
          `python ai-engine/highlight_detector.py "uploads/${req.file.filename}"`,
          async (error, stdout, stderr) => {

            console.log("Running highlight detection...");

            if (error) {
              console.error("Highlight error:", error);
              return;
            }

            console.log("Highlight output:", stdout);

            let result;
            try {
              result = JSON.parse(stdout);
            } catch (e) {
              console.error("Invalid JSON from highlight detector");
              return;
            }

            await Video.findByIdAndUpdate(savedVideo._id, {
              highlights: result.highlights,
              status: "generating_clips"
            });

            console.log("Highlights saved");

            // -------------------------
            // STEP 3: Clip Generation (NO FILE)
            // -------------------------
            const pythonProcess = spawn("python", [
              "ai-engine/clip_generation.py",
              `uploads/${req.file.filename}`
            ]);

            console.log("Generating clips...");

            // send highlights via stdin
            pythonProcess.stdin.write(JSON.stringify(result.highlights));
            pythonProcess.stdin.end();

            let output = "";

            pythonProcess.stdout.on("data", (data) => {
              output += data.toString();
            });

            pythonProcess.stderr.on("data", (data) => {
              console.error("Python stderr:", data.toString());
            });

            pythonProcess.on("close", async () => {
              let clipResult;

              try {
                clipResult = JSON.parse(output);
              } catch (e) {
                console.error("Invalid JSON from clip generator");
                return;
              }

              await Video.findByIdAndUpdate(savedVideo._id, {
                clips: clipResult.clips,
                status: "completed"
              });

              console.log("Clips generated:", clipResult.clips);
            });
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

// -------------------------
// GET API
// -------------------------
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    res.json(video);

  } catch (error) {
    res.status(500).json({ message: "Error fetching video" });
  }
};