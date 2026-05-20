const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const connectDB = require("./config/db");

const app = express();


// =========================
// MIDDLEWARE
// =========================

app.use(cors());

app.use(express.json());


// =========================
// SERVE UPLOADS FOLDER
// =========================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);
app.use("/clips", express.static("ai-engine/clips"));

app.use("/platform", express.static("ai-engine/platform"));

app.use("/thumbnail", express.static("ai-engine/thumbnail"));


// =========================
// DATABASE
// =========================

connectDB();


// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
  res.send("MongoDB Backend Running...");
});


// =========================
// ROUTES
// =========================

const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");

app.use("/api/auth", authRoutes);

app.use("/api/videos", videoRoutes);


// =========================
// SERVER
// =========================

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});