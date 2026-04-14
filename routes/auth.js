// Author: Timothy Sisa
// Defines all authentication-related API routes.
// express-validator chains run before the controller to catch bad input early.

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { register, login, logout, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

//  Validation chains 

// Rules shared by both register and login for the email field
const emailValidation = body("email")
  .trim()
  .notEmpty().withMessage("Email is required.")
  .isEmail().withMessage("Please enter a valid email address.")
  .normalizeEmail(); // Lowercases domain, removes dots in gmail etc.

// Strong password rules for registration
const registerPasswordValidation = body("password")
  .notEmpty().withMessage("Password is required.")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
  .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter.")
  .matches(/[0-9]/).withMessage("Password must contain at least one number.")
  .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character.");

// Routes 

// POST /api/auth/register
router.post(
  "/register",
  [
    body("username")
      .trim()
      .notEmpty().withMessage("Username is required.")
      .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 and 30 characters.")
      .isAlphanumeric().withMessage("Username may only contain letters and numbers."),
    emailValidation,
    registerPasswordValidation,
    body("role")
      .optional()
      .isIn(["student", "lecturer"]).withMessage("Role must be 'student' or 'lecturer'."),
  ],
  register
);

// POST /api/auth/login
router.post(
  "/login",
  [
    emailValidation,
    body("password").notEmpty().withMessage("Password is required."),
  ],
  login
);

// POST /api/auth/logout — requires active session
router.post("/logout", requireAuth, logout);

// GET /api/auth/me — returns the current user's profile
router.get("/me", requireAuth, getMe);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [emailValidation],
  forgotPassword
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required."),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters.")
  ],
  resetPassword
);

module.exports = router;
