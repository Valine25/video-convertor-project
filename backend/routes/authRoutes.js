const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controller/authController");


// REGISTER
router.post("/register", registerUser);


// LOGIN
router.post("/login", loginUser);


// FORGOT PASSWORD
router.post("/forgot-password", forgotPassword);


// RESET PASSWORD
router.post("/reset-password/:token", resetPassword);


module.exports = router;