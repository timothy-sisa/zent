// Author: Adarsh Pandit
// User profile management routes — update profile and view uploaded resources.

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const Resource = require("../models/Resource");

//  GET /api/users/:id/resources 
// Returns all resources uploaded by a specific user.
// Public route — useful for viewing another user's contributions.
router.get("/:id/resources", async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.params.id })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "username role");

    return res.status(200).json({ resources });
  } catch (err) {
    console.error("get user resources error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

//  PATCH /api/users/me 
// Allows the authenticated user to update their own username or email.
router.patch(
  "/me",
  requireAuth,
  [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 and 30 characters.")
      .isAlphanumeric().withMessage("Username may only contain letters and numbers."),
    body("email")
      .optional()
      .trim()
      .isEmail().withMessage("Please provide a valid email address.")
      .normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email } = req.body;
      const user = await User.findById(req.user._id);

      // Check for conflicts only if the value actually changed
      if (username && username !== user.username) {
        const taken = await User.findOne({ username });
        if (taken) {
          return res.status(409).json({ error: "That username is already taken." });
        }
        user.username = username;
      }

      if (email && email !== user.email) {
        const taken = await User.findOne({ email });
        if (taken) {
          return res.status(409).json({ error: "An account with that email already exists." });
        }
        user.email = email;
      }

      await user.save();

      return res.status(200).json({
        message: "Profile updated.",
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("update user error:", err.message);
      res.status(500).json({ error: "Server error while updating profile." });
    }
  }
);

module.exports = router;
