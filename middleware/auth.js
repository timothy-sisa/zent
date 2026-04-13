// Author:  Adarsh Pandit
// Middleware that protects routes by checking session authentication and user role.

const User = require("../models/User");

// Blocks unauthenticated requests by checking for a valid session user ID.
const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "You must be logged in to do that." });
  }

  try {
    // Fetch the user and attach them to the request so controllers can access their details.
    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      // Clear the session if it references a user that no longer exists.
      req.session.destroy();
      return res.status(401).json({ error: "Session invalid. Please log in again." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    res.status(500).json({ error: "Server error during authentication check." });
  }
};

// Blocks requests from users whose role does not match the required role.
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: `Access denied. This action requires the '${role}' role.` });
  }
  next();
};

module.exports = { requireAuth, requireRole };
