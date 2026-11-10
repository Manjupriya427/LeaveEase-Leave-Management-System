
const express = require("express");
const mongoose = require("mongoose");
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

// Calculate inclusive leave days
function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startUTC = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );

  const endUTC = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  );

  return Math.floor(
    (endUTC - startUTC) / (1000 * 60 * 60 * 24)
  ) + 1;
}

// Dashboard statistics
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const [pending, approved, rejected, students] = await Promise.all([
      Leave.countDocuments({ status: "Pending" }),
      Leave.countDocuments({ status: "Approved" }),
      Leave.countDocuments({ status: "Rejected" }),
      User.countDocuments({ role: "student" })
    ]);

    res.json({
      pending,
      approved,
      rejected,
      students
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);

    res.status(500).json({
      message: "Unable to retrieve dashboard statistics."
    });
  }
});

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
  const session = await mongoose.startSession();

  try {
    const { status, rejectionReason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Approved or Rejected."
      });
    }

    if (status === "Rejected") {
      if (
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim()
      ) {
        return res.status(400).json({
          message: "Please provide a rejection reason."
        });
      }

      if (rejectionReason.trim().length > 500) {
        return res.status(400).json({
          message: "Rejection reason cannot exceed 500 characters."
        });
      }
    }

    let updatedLeave;

    await session.withTransaction(async () => {
      const leave = await Leave.findOne({
        _id: req.params.id,
        status: "Pending"
      }).session(session);

      if (!leave) {
        throw new Error("LEAVE_NOT_PENDING");
      }

      if (status === "Approved") {
        const user = await User.findById(leave.user).session(session);

        if (!user) {
          throw new Error("STUDENT_NOT_FOUND");
        }

        const days = calculateLeaveDays(
          leave.startDate,
          leave.endDate
        );

        const balanceField =
          leave.leaveType === "casual"
            ? "casualLeave"
            : "medicalLeave";

        if (user[balanceField] < days) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        user[balanceField] -= days;
        await user.save({ session });

        leave.rejectionReason = "";
      } else {
        leave.rejectionReason = rejectionReason.trim();
      }

      leave.status = status;

      await leave.save({ session });

      updatedLeave = leave;
    });

    res.json({
      message: `Leave application ${status.toLowerCase()} successfully.`,
      leave: updatedLeave
    });

  } catch (error) {
    console.error("Process leave error:", error.message);

    if (error.message === "LEAVE_NOT_PENDING") {
      return res.status(404).json({
        message: "Pending leave application not found or already processed."
      });
    }

    if (error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        message: "Student account not found."
      });
    }

    if (error.message === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({
        message: "The student does not have enough leave balance."
      });
    }

    res.status(500).json({
      message: "Unable to process leave application."
    });

  } finally {
    await session.endSession();
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
