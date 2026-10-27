
const express = require("express");
const router = express.Router();
const Leave = require("../models/leave");
const User = require("../models/user");

// Allow only logged-in administrators
function isAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  if (req.session.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required."
    });
  }

  next();
}

// View all leave applications
router.get("/leaves", isAdmin, async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("user", "name email rollNumber")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error("Fetch all leaves error:", error.message);
    res.status(500).json({
      message: "Unable to retrieve leave applications."
    });
  }
});

// Approve or reject a leave application
router.patch("/leaves/:id", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Approved or Rejected."
      });
    }

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        message: "Leave application not found."
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        message: "This application has already been processed."
      });
    }

    if (status === "Approved") {
      const user = await User.findById(leave.user);

      if (!user) {
        return res.status(404).json({
          message: "Student account not found."
        });
      }

      const days =
        Math.floor(
          (Date.UTC(
            leave.endDate.getFullYear(),
            leave.endDate.getMonth(),
            leave.endDate.getDate()
          ) -
            Date.UTC(
              leave.startDate.getFullYear(),
              leave.startDate.getMonth(),
              leave.startDate.getDate()
            )) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      const balanceField =
        leave.leaveType === "casual" ? "casualLeave" : "medicalLeave";

      if (user[balanceField] < days) {
        return res.status(400).json({
          message: "The student does not have enough leave balance."
        });
      }

      user[balanceField] -= days;
      await user.save();
    }

    leave.status = status;
    await leave.save();

    res.json({
      message: `Leave application ${status.toLowerCase()} successfully.`,
      leave
    });
  } catch (error) {
    console.error("Process leave error:", error.message);
    res.status(500).json({
      message: "Unable to process leave application."
    });
  }
});

// View all student accounts
router.get("/students", isAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("-password")
      .sort({ name: 1 });

    res.json(students);
  } catch (error) {
    console.error("Fetch students error:", error.message);
    res.status(500).json({
      message: "Unable to retrieve student accounts."
    });
  }
});

module.exports = router;
