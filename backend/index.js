const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");


// ROUTES
const videoRoutes = require("./routes/videoRoutes");
const authRoutes = require("./routes/authRoutes");


const app = express();


// CONNECT DATABASE
connectDB();


// MIDDLEWARES
app.use(cors());
app.use(express.json());


// TEST ROUTE
app.get("/", (req, res) => {
  res.send("PulseForge Backend Running...");
});


// API ROUTES
app.use("/api/videos", videoRoutes);

app.use("/api/auth", authRoutes);


// SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});