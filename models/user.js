
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student",
    required: true
  },
  rollNumber: {
    type: String,
    default: ""
  },
  casualLeave: {
    type: Number,
    default: 12
  },
  medicalLeave: {
    type: Number,
    default: 6
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
