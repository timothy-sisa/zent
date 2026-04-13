// Author:  Alazar Kidane
// Defines all resource-related API routes including CRUD, rating,
// favourites, comments, and recently viewed.

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const Resource = require("../models/Resource");

const {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  rateResource,
  toggleFavourite,
  getRecentlyViewed,
} = require("../controllers/resourceController");

const {
  addComment,
  getComments,
  deleteComment,
} = require("../controllers/commentController");

//  Validation chains 

// Reusable resource type validation
const resourceTypeValidation = body("resourceType")
  .isIn(["lecture_notes", "past_paper", "study_guide", "other"])
  .withMessage("Resource type must be one of: lecture_notes, past_paper, study_guide, other.");

//  Resource CRUD 

// GET /api/resources — browse, search, filter, sort (public)
router.get("/", getResources);

// GET /api/resources/recently-viewed — session-based recently viewed list
router.get("/recently-viewed", requireAuth, getRecentlyViewed);

// GET /api/resources/:id — single resource detail (public)
router.get("/:id", getResourceById);

// POST /api/resources — upload a new resource (auth required)
// upload.single("file") runs Multer before the validator and controller
router.post(
  "/",
  requireAuth,
  upload.single("file"),
  [
    body("title")
      .trim()
      .notEmpty().withMessage("Title is required.")
      .isLength({ max: 150 }).withMessage("Title cannot exceed 150 characters."),
    body("description")
      .trim()
      .notEmpty().withMessage("Description is required.")
      .isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters."),
    body("category")
      .trim()
      .notEmpty().withMessage("Category is required."),
    resourceTypeValidation,
  ],
  createResource
);

// PUT /api/resources/:id — update resource metadata (auth required)
router.put(
  "/:id",
  requireAuth,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ max: 150 }).withMessage("Title cannot exceed 150 characters."),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage("Description cannot exceed 1000 characters."),
    body("category").optional().trim(),
    body("resourceType")
      .optional()
      .isIn(["lecture_notes", "past_paper", "study_guide", "other"])
      .withMessage("Invalid resource type."),
  ],
  updateResource
);

// DELETE /api/resources/:id — delete a resource (auth required)
router.delete("/:id", requireAuth, deleteResource);

//  Rating 

// POST /api/resources/:id/rate — submit or update a rating (auth required)
router.post(
  "/:id/rate",
  requireAuth,
  [
    body("rating")
      .notEmpty().withMessage("A rating value is required.")
      .isInt({ min: 1, max: 5 }).withMessage("Rating must be an integer between 1 and 5."),
  ],
  rateResource
);

//  Favourites 

// POST /api/resources/:id/favourite — toggle favourite (auth required)
router.post("/:id/favourite", requireAuth, toggleFavourite);

//  Comments

// GET /api/resources/:id/comments — get all comments for a resource (public)
router.get("/:id/comments", getComments);

// POST /api/resources/:id/comments — add a comment (auth required)
router.post(
  "/:id/comments",
  requireAuth,
  [
    body("body")
      .trim()
      .notEmpty().withMessage("Comment text is required.")
      .isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters."),
  ],
  addComment
);

// DELETE /api/comments/:commentId — delete a comment (auth required)
// Note: mounted at /api/resources but accesses comment by its own ID
router.delete("/comments/:commentId", requireAuth, deleteComment);

//  File download 

// GET /api/resources/:id/file — streams the file from MongoDB GridFS to the client
router.get("/:id/file", async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: "Resource not found." });

    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    // Stream the file directly from MongoDB to the HTTP response
    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(resource.filePath)
    );

    downloadStream.on("error", () => {
      res.status(404).json({ error: "File not found in storage." });
    });

    // Tell the browser the filename so it downloads with the correct name
    res.set("Content-Disposition", `attachment; filename="${resource.originalFileName}"`);
    downloadStream.pipe(res);

  } catch (err) {
    console.error("file download error:", err.message);
    res.status(500).json({ error: "Server error while retrieving file." });
  }
});

module.exports = router;
