const express = require("express");
const multer = require("multer");
const router = express.Router();
const videoController = require("../controller/videoController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/upload", upload.single("video"), videoController.uploadVideo);

module.exports = router;