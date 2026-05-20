const Video = require("../models/video");
const { exec, spawn } = require("child_process");

// =========================
// UPLOAD VIDEO
// =========================

exports.uploadVideo = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const { userId } = req.body;

    console.log("Uploading video:", req.file.filename);

    // =========================
    // CREATE VIDEO ENTRY
    // =========================

    const newVideo = new Video({

      userId,

      filename: req.file.filename,

      originalName: req.file.originalname,

      status: "preprocessing",

      transcript: "",

      highlights: [],

      captions: "",

      hashtags: [],

      viralityScore: 0,

      generatedReel: "",

      platformReel: "",

      thumbnail: "",
    });

    const savedVideo = await newVideo.save();

    // =========================
    // STEP 1 - PREPROCESS
    // =========================

    exec(
      `python ai-engine/preprocess.py "uploads/${req.file.filename}"`,

      async (error, stdout, stderr) => {

        console.log("Running preprocess...");

        if (error) {
          console.error("Preprocess Error:", error);
          return;
        }

        const transcript = stdout;

        await Video.findByIdAndUpdate(savedVideo._id, {

          transcript,

          status: "detecting_highlights",
        });

        console.log("Transcript saved");

        // =========================
        // STEP 2 - HIGHLIGHT DETECTION
        // =========================

        exec(
          `python ai-engine/highlight_detector.py "uploads/${req.file.filename}"`,

          async (error, stdout, stderr) => {

            console.log("Detecting highlights...");

            if (error) {
              console.error("Highlight Error:", error);
              return;
            }

            let result;

            try {

              result = JSON.parse(stdout);

            } catch (err) {

              console.error("Invalid JSON from highlight detector");

              console.log(stdout);

              return;
            }

            // =========================
            // SAVE HIGHLIGHT DATA
            // =========================

            await Video.findByIdAndUpdate(savedVideo._id, {

              highlights: result.highlights || [],

              hashtags: result.hashtags || [],

              viralityScore:
                result.virality_score || 0,

              thumbnail:
                result.thumbnail || "",

              status: "generating_reels",
            });

            console.log("Highlights detected");

            // =========================
            // STEP 3 - GENERATE REELS
            // =========================

            const pythonProcess = spawn("python", [

              "ai-engine/clip_generation.py",

              `uploads/${req.file.filename}`,
            ]);

            pythonProcess.stdin.write(
              JSON.stringify(result.highlights || [])
            );

            pythonProcess.stdin.end();

            let output = "";

            pythonProcess.stdout.on("data", (data) => {

              output += data.toString();
            });

            pythonProcess.stderr.on("data", (data) => {

              console.error(data.toString());
            });

            pythonProcess.on("close", async () => {

              let clipResult;

              try {

                clipResult = JSON.parse(output);

              } catch (err) {

                console.error(
                  "Invalid JSON from clip generator"
                );

                console.log(output);

                return;
              }

              // =========================
              // GENERATED REELS
              // =========================

              const generatedClip =
                clipResult.clips?.[0] || "";

              const platformClip =
                clipResult.platformClips?.[0] || "";
              // =========================
              // SAVE FINAL OUTPUTS
              // =========================

              await Video.findByIdAndUpdate(savedVideo._id, {

                generatedReel: generatedClip,

                platformReel: platformClip,

                captions:
                  "AI generated captions will appear here.",

                hashtags:
                  result.hashtags || [],

                viralityScore:
                  result.virality_score || 0,

                thumbnail:
                  result.thumbnail || "",

                status: "completed",
              });

              console.log("AI processing completed");
            });
          }
        );
      }
    );

    // =========================
    // RESPONSE
    // =========================

    res.status(201).json({

      message: "Video uploaded successfully",

      videoId: savedVideo._id,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// GET VIDEO BY ID
// =========================

exports.getVideoById = async (req, res) => {

  try {

    const video = await Video.findById(
      req.params.id
    );

    if (!video) {

      return res.status(404).json({
        message: "Video not found",
      });
    }

    res.json(video);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error fetching video",
    });
  }
};

// =========================
// GET USER HISTORY
// =========================

exports.getUserVideos = async (req, res) => {

  try {

    const videos = await Video.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.json(videos);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error fetching videos",
    });
  }
};

// =========================
// DELETE VIDEO
// =========================

exports.deleteVideo = async (req, res) => {

  try {

    const { id } = req.params;

    const { userId } = req.query;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    if (video.userId !== userId) {
      return res.status(403).json({
        message: "Not authorized to delete this video",
      });
    }

    await Video.findByIdAndDelete(id);

    res.json({
      message: "Video deleted successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error deleting video",
    });
  }
};