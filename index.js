const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("MongoDB Backend Running...");
});

// Routes
const videoRoutes = require("./routes/videoRoutes");
app.use("/api/videos", videoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});