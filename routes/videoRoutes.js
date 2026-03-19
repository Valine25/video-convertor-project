const express = require("express");
const multer = require("multer");
const router = express.Router();
const videoController = require("../controller/videoController");

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Upload API
router.post("/upload", upload.single("video"), videoController.uploadVideo);

// 🔥 GET API (VERY IMPORTANT FOR DEMO)
router.get("/:id", videoController.getVideoById);

module.exports = router;