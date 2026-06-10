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


router.post(
  "/upload",
  upload.single("video"),
  videoController.uploadVideo
);


router.get(
  "/:id",
  videoController.getVideoById
);

router.get(
  "/user/:userId",
  videoController.getUserVideos
);

router.delete(
  "/:id",
  videoController.deleteVideo
);

module.exports = router;