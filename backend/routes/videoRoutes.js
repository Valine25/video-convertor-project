const express = require("express");
const multer = require("multer");

const router = express.Router();

const videoController = require("../controller/videoController");

// =========================
// MULTER STORAGE
// =========================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },

});

const upload = multer({ storage });

// =========================
// ROUTES
// =========================

// Upload Video
router.post(
  "/upload",
  upload.single("video"),
  videoController.uploadVideo
);

// Get One Video
router.get(
  "/:id",
  videoController.getVideoById
);

// Get User History
router.get(
  "/user/:userId",
  videoController.getUserVideos
);

// Delete Video
router.delete(
  "/:id",
  videoController.deleteVideo
);

module.exports = router;