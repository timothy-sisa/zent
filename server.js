// Authors: Timothy Sisa, Alazar Kidane, Adarsh Pandit
// Main entry point — sets up Express, middleware, sessions, cookies, and routes.

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const resourceRoutes = require("./routes/resources");
const userRoutes = require("./routes/users");

// Connect to MongoDB before starting the server.
connectDB();

const app = express();

// Parse JSON and form bodies from incoming requests.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable cookie parsing so the userRole cookie can be read.
app.use(cookieParser());

// Store sessions in MongoDB so they persist across server restarts.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret_change_in_production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // Sessions expire after 14 days.
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// Mount all API route groups.
app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint used by Render to confirm the server is running.
app.get("/", (req, res) => {
  res.status(200).json({ message: "ZENT Academic Resource Platform API is running.", version: "1.0.0" });
});

// Global error handler — catches Multer file errors and any unhandled exceptions.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File is too large. Maximum size is 10 MB." });
  }
  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "An unexpected server error occurred." });
});

// 404 handler for any route that doesn't match the ones defined above.
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
