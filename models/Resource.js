// Author:  Alazar Kidane
// Defines the schema for academic resources including embedded ratings and a text search index.

const mongoose = require("mongoose");

// Each rating entry links a user to their star value for this resource.
const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    // Human-readable title shown in search results and resource cards.
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    // A brief summary of what the resource contains.
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Broad subject area used for filtering (e.g. "Computer Science").
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    // The specific format of the material — used for type filtering.
    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
      enum: ["lecture_notes", "past_paper", "study_guide", "other"],
    },

    // GridFS ObjectId of the uploaded file stored in MongoDB GridFS.
    // Used to stream the file back via GET /api/resources/:id/file.
    filePath: { type: String, required: true },

    // The original filename as provided by the user at upload time.
    originalFileName: { type: String, required: true },

    // Reference to the user who uploaded this resource.
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Embedded array of per-user ratings — one entry per user enforced in the controller.
    ratings: [ratingSchema],

    // Computed average of all submitted ratings — updated after each new rating.
    averageRating: { type: Number, default: 0 },

    // Incremented each time the resource detail page is viewed.
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index enables full-text search across title, description, and category.
resourceSchema.index({ title: "text", description: "text", category: "text" });

// Recalculates and stores the average rating from all submitted entries.
resourceSchema.methods.calculateAverageRating = function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
  } else {
    const total = this.ratings.reduce((sum, r) => sum + r.value, 0);
    this.averageRating = Math.round((total / this.ratings.length) * 10) / 10;
  }
};

module.exports = mongoose.model("Resource", resourceSchema);
