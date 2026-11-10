
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

const router = express.Router();

// STUDENT REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, rollNumber } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof rollNumber !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !rollNumber.trim()
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRoll = rollNumber.trim();

    // Check existing email or roll number
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { rollNumber: normalizedRoll }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email or roll number is already registered."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Always create a student account.
    // Leave balances use the defaults in User.js.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      rollNumber: normalizedRoll,
      role: "student"
    });

    return res.status(201).json({
      message: "Registration successful! Please sign in.",
      userId: user._id
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or roll number is already registered."
      });
    }

    return res.status(500).json({
      message: "Unable to register. Please try again."
    });
  }
});


// COMMON LOGIN FOR STUDENTS AND ADMINISTRATORS
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Verify account role
    if (!["student", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Invalid account role. Please contact the administrator."
      });
    }

    // Save user details in session
    req.session.userId = user._id.toString();
    req.session.role = user.role;

    return req.session.save((error) => {
      if (error) {
        console.error("Session save error:", error.message);

        return res.status(500).json({
          message: "Unable to start your session."
        });
      }

      return res.json({
        message: "Login successful!",
        role: user.role
      });
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Server error during login."
    });
  }
});


// GET CURRENT LOGGED-IN USER
router.get("/me", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in first."
      });
    }

    const user = await User.findById(req.session.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User account not found."
      });
    }

    return res.json(user);

  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      message: "Unable to load user details."
    });
  }
});


// LOGOUT
router.post("/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      message: "Logged out successfully."
    });
  }

  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        message: "Unable to log out."
      });
    }

    res.clearCookie("connect.sid");

    return res.json({
      message: "Logged out successfully."
    });
  });
});

module.exports = router;
