// Author: Alazar Kidane
// Configures Multer to hold uploaded files in memory before they are written to MongoDB GridFS.

const multer = require("multer");

// Only accept common academic document formats — rejects anything else with an error.
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, Word, PowerPoint, and plain text files are accepted."), false);
  }
};

// Use memory storage so the file buffer can be piped directly into GridFS in the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum file size.
});

module.exports = upload;
