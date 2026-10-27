
const express = require("express");
const router = express.Router();
const Leave = require("../models/leave");

// Check whether the user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  next();
}

// Apply for leave
router.post("/", isLoggedIn, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Please fill in all leave details."
      });
    }

    if (!["casual", "medical"].includes(leaveType)) {
      return res.status(400).json({
        message: "Invalid leave type."
      });
    }

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
router.get("/my-leaves", isLoggedIn, async (req, res) => {
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
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
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
