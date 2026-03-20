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

// Routes
router.post("/upload", upload.single("video"), videoController.uploadVideo);
router.get("/:id", videoController.getVideoById);

module.exports = router;