// Author:  Alazar Kidane
// Handles all resource operations: upload, browse, update, delete, rating, favourites, and recently viewed.

const { validationResult } = require("express-validator");
const Resource = require("../models/Resource");
const User = require("../models/User");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const { Readable } = require("stream");

// Uploads the file to GridFS and saves the resource metadata to MongoDB.
const createResource = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!req.file) {
    return res.status(400).json({ error: "A file must be uploaded with each resource." });
  }

  const { title, description, category, resourceType } = req.body;

  try {
    // Open a GridFS bucket and stream the file buffer into MongoDB.
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    const readableStream = Readable.from(req.file.buffer);
    const uploadStream = bucket.openUploadStream(req.file.originalname, { contentType: req.file.mimetype });

    await new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream).on("finish", resolve).on("error", reject);
    });

    // Store the GridFS file ID as filePath so we can retrieve the file later.
    const resource = await Resource.create({
      title, description, category, resourceType,
      filePath: uploadStream.id.toString(),
      originalFileName: req.file.originalname,
      uploadedBy: req.user._id,
    });

    await resource.populate("uploadedBy", "username role");
    return res.status(201).json({ message: "Resource uploaded successfully.", resource });
  } catch (err) {
    console.error("createResource error:", err.message);
    res.status(500).json({ error: "Server error. Resource could not be saved." });
  }
};

// Returns a paginated list of resources filtered and sorted by query parameters.
const getResources = async (req, res) => {
  try {
    const { search, type, category, sort = "newest", page = 1, limit = 10 } = req.query;

    const filter = {};

    // Use MongoDB text index for full-text search across title, description, and category.
    if (search) filter.$text = { $search: search };

    // Filter by exact resource type or partial category match.
    if (type) filter.resourceType = type;
    if (category) filter.category = { $regex: category, $options: "i" };

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      highest_rated: { averageRating: -1 },
      most_viewed: { viewCount: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Run the query and total count in parallel to avoid two sequential DB calls.
    const [resources, total] = await Promise.all([
      Resource.find(filter).sort(sortBy).skip(skip).limit(limitNum).populate("uploadedBy", "username role"),
      Resource.countDocuments(filter),
    ]);

    return res.status(200).json({
      resources,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
    });
  } catch (err) {
    console.error("getResources error:", err.message);
    res.status(500).json({ error: "Server error while fetching resources." });
  }
};

// Returns a single resource by ID, increments its view count, and tracks it in the session.
const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate("uploadedBy", "username role");

    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    // Keep a session list of recently viewed resource IDs, capped at 10.
    if (!req.session.recentlyViewed) req.session.recentlyViewed = [];
    const filtered = req.session.recentlyViewed.filter((id) => id !== req.params.id);
    filtered.unshift(req.params.id);
    req.session.recentlyViewed = filtered.slice(0, 10);

    return res.status(200).json({ resource });
  } catch (err) {
    console.error("getResourceById error:", err.message);
    res.status(500).json({ error: "Server error while fetching resource." });
  }
};

// Updates a resource's metadata — only the uploader or a lecturer may do this.
const updateResource = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === "lecturer";

    if (!isOwner && !isLecturer) {
      return res.status(403).json({ error: "You do not have permission to edit this resource." });
    }

    // Only apply fields that were actually included in the request body.
    const { title, description, category, resourceType } = req.body;
    if (title !== undefined) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (category !== undefined) resource.category = category;
    if (resourceType !== undefined) resource.resourceType = resourceType;

    await resource.save();
    await resource.populate("uploadedBy", "username role");
    return res.status(200).json({ message: "Resource updated successfully.", resource });
  } catch (err) {
    console.error("updateResource error:", err.message);
    res.status(500).json({ error: "Server error while updating resource." });
  }
};

// Deletes the resource document and its file from GridFS — only the uploader or a lecturer may do this.
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === "lecturer";

    if (!isOwner && !isLecturer) {
      return res.status(403).json({ error: "You do not have permission to delete this resource." });
    }

    // Remove the file from GridFS before deleting the metadata document.
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
    try {
      await bucket.delete(new mongoose.Types.ObjectId(resource.filePath));
    } catch (gridErr) {
      // Log the warning but continue — the metadata should still be deleted.
      console.warn("GridFS file not found during delete:", gridErr.message);
    }

    await resource.deleteOne();
    return res.status(200).json({ message: "Resource deleted successfully." });
  } catch (err) {
    console.error("deleteResource error:", err.message);
    res.status(500).json({ error: "Server error while deleting resource." });
  }
};

// Adds or updates the user's star rating for a resource and recalculates the average.
const rateResource = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rating } = req.body;

  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    // Update the existing rating if the user has already rated, otherwise add a new one.
    const existingRating = resource.ratings.find((r) => r.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.value = rating;
    } else {
      resource.ratings.push({ user: req.user._id, value: rating });
    }

    resource.calculateAverageRating();
    await resource.save();

    return res.status(200).json({ message: "Rating submitted.", averageRating: resource.averageRating, totalRatings: resource.ratings.length });
  } catch (err) {
    console.error("rateResource error:", err.message);
    res.status(500).json({ error: "Server error while submitting rating." });
  }
};

// Adds the resource to favourites if not already there, or removes it if it is.
const toggleFavourite = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: "Resource not found." });
    }

    const user = await User.findById(req.user._id);
    const alreadyFavourited = user.favourites.includes(req.params.id);

    if (alreadyFavourited) {
      user.favourites = user.favourites.filter((id) => id.toString() !== req.params.id);
      await user.save();
      return res.status(200).json({ message: "Removed from favourites.", favourited: false });
    } else {
      user.favourites.push(req.params.id);
      await user.save();
      return res.status(200).json({ message: "Added to favourites.", favourited: true });
    }
  } catch (err) {
    console.error("toggleFavourite error:", err.message);
    res.status(500).json({ error: "Server error while updating favourites." });
  }
};

// Returns the last 10 resources the user visited this session, in order of most recent first.
const getRecentlyViewed = async (req, res) => {
  try {
    const ids = req.session.recentlyViewed || [];
    const resources = await Resource.find({ _id: { $in: ids } }).populate("uploadedBy", "username");

    // Re-order results to match the session array since MongoDB doesn't preserve order.
    const ordered = ids.map((id) => resources.find((r) => r._id.toString() === id)).filter(Boolean);
    return res.status(200).json({ resources: ordered });
  } catch (err) {
    console.error("getRecentlyViewed error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
};

module.exports = { createResource, getResources, getResourceById, updateResource, deleteResource, rateResource, toggleFavourite, getRecentlyViewed };
