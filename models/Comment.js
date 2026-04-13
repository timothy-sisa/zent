// Author:  Adarsh Pandit
// Defines the schema for comments left on academic resources.

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    // The resource this comment belongs to.
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },

    // The user who wrote the comment.
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // The text content of the comment.
    body: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: [1, "Comment cannot be empty"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
