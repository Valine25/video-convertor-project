const mongoose = require("mongoose");

const creatorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    passwordResetToken: {
      type: String,
    },

    passwordResetExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Creators", creatorSchema);