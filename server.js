
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const path = require("path");
require("dotenv").config();

const app = express();

app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "leaveease-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
    }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);

// Authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

// Other API routes
app.use("/api/leaves", require("./routes/leaveRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Backend health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend is running successfully!"
  });
});

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5050;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
