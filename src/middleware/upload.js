const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const {validationResult} = require('express-validator');
const {logger} = require('../config/logger');

// Helper: Check magic number (file signature) for image types
async function isValidImageSignature(filePath, mimetype) {
  const signatures = {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
  };
  const expected = signatures[mimetype];
  if (!expected) return false;
  try {
    const file = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(expected.length);
    await file.read(buffer, 0, expected.length, 0);
    await file.close();
    return expected.every((byte, i) => buffer[i] === byte);
  } catch (err) {
    return false;
  }
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: async(req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');

    try {
      await fs.mkdir(uploadDir, {recursive: true});
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    const filename = `face_${timestamp}_${randomString}${ext}`;
    cb(null, filename);
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return cb(new Error('File too large. Maximum size is 10MB.'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only one file at a time
  },
});

// Image processing middleware
const processImage = async(req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    // --- Magic number validation ---
    const isValid = await isValidImageSignature(req.file.path, req.file.mimetype);
    if (!isValid) {
      logger.warn('File signature mismatch or invalid image', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
      });
      await fs.unlink(req.file.path);
      return res.status(400).json({error: 'Invalid image file signature'});
    }
    // --- End magic number validation ---

    const inputPath = req.file.path;
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_processed.jpg');

    // Process image with Sharp
    await sharp(inputPath)
      .rotate() // Auto-rotate based on EXIF data
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .normalize() // Enhance image contrast
      .jpeg({
        quality: 85,
        progressive: true,
        force: true,
        // Remove all metadata (EXIF, etc)
        mozjpeg: true,
      })
      .toFile(outputPath);

    // Update file path to processed image
    req.file.processedPath = outputPath;

    // Add image metadata
    const metadata = await sharp(inputPath).metadata();
    req.file.metadata = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: req.file.size,
    };

    next();
  } catch (error) {
    logger.error('Image processing error', {error: error.message});
    return res.status(500).json({
      error: 'Failed to process image',
    });
  }
};

// Validation middleware
const validateUpload = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }

  next();
};

// Cleanup middleware - remove original file after processing
const cleanupOriginal = async(req, res, next) => {
  try {
    if (req.file && req.file.processedPath && req.file.path !== req.file.processedPath) {
      await fs.unlink(req.file.path);
      req.file.path = req.file.processedPath;
    }
    next();
  } catch (error) {
    console.error('Cleanup error:', error);
    next(); // Continue even if cleanup fails
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Only one file allowed.',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field.',
      });
    }
  }

  if (error.message) {
    return res.status(400).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: 'File upload failed',
  });
};

// Single file upload middleware
const uploadSingle = upload.single('image');

// Complete upload middleware chain
const uploadMiddleware = [uploadSingle, handleUploadError, processImage, cleanupOriginal];

module.exports = {
  upload,
  uploadSingle,
  uploadMiddleware,
  processImage,
  validateUpload,
  cleanupOriginal,
  handleUploadError,
  isValidImageSignature,
};
