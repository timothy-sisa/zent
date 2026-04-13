// Author:  Adarsh Pandit
// Handles posting, retrieving, and deleting comments on resources.

const { validationResult } = require("express-validator");
const Comment = require("../models/Comment");
const Resource = require("../models/Resource");

// Creates a new comment on a resource after confirming the resource exists.
const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    const comment = await Comment.create({
      resource: req.params.id,
      author: req.user._id,
      body: req.body.body,
    });

    await comment.populate("author", "username role");
    return res.status(201).json({ message: "Comment posted.", comment });
  } catch (err) {
    console.error("addComment error:", err.message);
    res.status(500).json({ error: "Server error while posting comment." });
  }
};

// Returns all comments for a resource sorted oldest first for a natural discussion flow.
const getComments = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    const comments = await Comment.find({ resource: req.params.id })
      .sort({ createdAt: 1 })
      .populate("author", "username role");

    return res.status(200).json({ comments });
  } catch (err) {
    console.error("getComments error:", err.message);
    res.status(500).json({ error: "Server error while fetching comments." });
  }
};

// Deletes a comment — only the comment's author or a lecturer may do this.
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isLecturer = req.user.role === "lecturer";

    if (!isAuthor && !isLecturer) {
      return res.status(403).json({ error: "You do not have permission to delete this comment." });
    }

    await comment.deleteOne();
    return res.status(200).json({ message: "Comment deleted." });
  } catch (err) {
    console.error("deleteComment error:", err.message);
    res.status(500).json({ error: "Server error while deleting comment." });
  }
};

module.exports = { addComment, getComments, deleteComment };
