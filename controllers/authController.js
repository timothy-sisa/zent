// Author: Timothy Sisa
// Handles user registration, login, logout, and current user retrieval.

const { validationResult } = require("express-validator");
const User = require("../models/User");
const crypto = require("crypto");

// Creates a new user account, starts a session, and sets the role cookie.
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    // Reject registration if the email or username is already in use.
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    // Password is hashed automatically by the pre-save hook in the User model.
    const user = await User.create({ username, email, password, role });

    // Store the user ID in the session to keep them logged in.
    req.session.userId = user._id;

    // Set a cookie so the client knows the user's role without an extra request.
    res.cookie("userRole", user.role, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" });

    return res.status(201).json({
      message: "Account created successfully.",
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("register error:", err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
};

// Verifies credentials, starts a session, and refreshes the role cookie.
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");

    // Use a vague error message to avoid revealing whether an email is registered.
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatch = await user.matchPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.userId = user._id;
    res.cookie("userRole", user.role, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" });

    return res.status(200).json({
      message: "Logged in successfully.",
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("login error:", err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
};

// Destroys the session and clears all auth cookies.
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("logout session destroy error:", err.message);
      return res.status(500).json({ error: "Could not log out. Please try again." });
    }
    res.clearCookie("userRole");
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully." });
  });
};

// Returns the logged-in user's profile including their favourited resources.
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("favourites", "title resourceType averageRating");
    return res.status(200).json({ user });
  } catch (err) {
    console.error("getMe error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
};


// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account with that email." });
    }
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    // For assignment: return token in response (normally, send by email)
    return res.status(200).json({ message: "Password reset token generated.", token });
  } catch (err) {
    console.error("forgotPassword error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token." });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.status(200).json({ message: "Password has been reset." });
  } catch (err) {
    console.error("resetPassword error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
};

module.exports = { register, login, logout, getMe, forgotPassword, resetPassword };
