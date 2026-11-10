
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Leave = require("../models/leave");
const User = require("../models/user");

// Check whether the user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  next();
}

// Check whether the logged-in user is a student
async function isStudent(req, res, next) {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    if (user.role !== "student") {
      return res.status(403).json({
        message: "Only students can perform this action."
      });
    }

    next();

  } catch (error) {
    console.error("Student verification error:", error.message);

    res.status(500).json({
      message: "Unable to verify user."
    });
  }
}

// Apply for leave
router.post("/", isLoggedIn, isStudent, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Please fill in all leave details."
      });
    }

    // Validate leave type
    if (!["casual", "medical"].includes(leaveType)) {
      return res.status(400).json({
        message: "Invalid leave type."
      });
    }

    // Validate reason
    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Please enter a valid reason."
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        message: "Reason cannot exceed 500 characters."
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        message: "Please enter valid leave dates."
      });
    }

    // Prevent past leave applications
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        message: "Leave start date cannot be in the past."
      });
    }

    // Create leave application
    const leave = await Leave.create({
      user: req.session.userId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      status: "Pending"
    });

    res.status(201).json({
      message: "Leave application submitted successfully!",
      leave
    });

  } catch (error) {
    console.error("Apply leave error:", error.message);

    res.status(500).json({
      message: "Unable to submit leave application."
    });
  }
});

// View the logged-in student's leave applications
router.get("/my-leaves", isLoggedIn, isStudent, async (req, res) => {
  try {
    const leaves = await Leave.find({
      user: req.session.userId
    }).sort({ createdAt: -1 });

    res.json(leaves);

  } catch (error) {
    console.error("Fetch leaves error:", error.message);

    res.status(500).json({
      message: "Unable to retrieve leave applications."
    });
  }
});

// Cancel a pending leave application
router.delete("/:id", isLoggedIn, isStudent, async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid leave application ID."
      });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      user: req.session.userId,
      status: "Pending"
    });

    if (!leave) {
      return res.status(404).json({
        message: "Pending leave application not found."
      });
    }

    await leave.deleteOne();

    res.json({
      message: "Leave application cancelled successfully."
    });

  } catch (error) {
    console.error("Cancel leave error:", error.message);

    res.status(500).json({
      message: "Unable to cancel leave application."
    });
  }
});

module.exports = router;
