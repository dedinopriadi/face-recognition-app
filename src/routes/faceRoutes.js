const express = require('express');
const {uploadMiddleware} = require('../middleware/upload');
const faceController = require('../controllers/faceController');
const {
  enrollValidationRules,
  recognizeValidationRules,
  validate,
} = require('../middleware/validator');

// --- Rate Limiting Setup ---
const rateLimit = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis');
const {redisClient} = require('../config/redis');

// Limiter khusus untuk endpoint sensitif (enroll & recognize)
let sensitiveLimiter = (req, res, next) => next();
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_RATE_LIMIT !== 'true') {
  sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 10, // Maksimal 10 request per 15 menit per IP
    message: {
      error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
  });
}
// --- End Rate Limiting Setup ---

// eslint-disable-next-line new-cap
const router = express.Router();

// Routes

// Enroll new face
router.post(
  '/enroll',
  sensitiveLimiter,
  uploadMiddleware,
  enrollValidationRules(),
  validate,
  faceController.enroll,
);

// Recognize face
router.post(
  '/recognize',
  sensitiveLimiter,
  uploadMiddleware,
  recognizeValidationRules(),
  validate,
  faceController.recognize,
);

// Get dashboard data
router.get('/dashboard', faceController.dashboard);

// Get all faces
router.get('/faces', async(req, res) => {
  try {
    const {dbHelpers} = require('../config/database');
    const faces = await dbHelpers.getAllFaces();

    res.json({
      data: faces.map(face => ({
        id: face.id,
        name: face.name,
        imagePath: face.image_path,
        createdAt: face.created_at,
        updatedAt: face.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get faces error:', error);
    res.status(500).json({
      error: 'Failed to get faces',
      details: error.message,
    });
  }
});

// Get face by ID
router.get('/faces/:id', faceController.getFace);

// Delete face
router.delete('/faces/:id', faceController.deleteFace);

// Health check for face recognition service
router.get('/health', async(req, res) => {
  try {
    const faceRecognitionService = require('../services/faceRecognitionService');
    const modelsLoaded = await faceRecognitionService.loadModels();

    res.json({
      status: 'OK',
      faceRecognition: {
        modelsLoaded,
        service: 'face-api.js',
        version: '0.22.2',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get face recognition statistics
router.get('/stats', async(req, res) => {
  try {
    const {dbHelpers} = require('../config/database');
    const stats = await dbHelpers.getStats();

    res.json({
      data: {
        totalFaces: stats.total_faces || 0,
        uniqueFacesRecognized: stats.unique_faces_recognized || 0,
        averageConfidence: stats.avg_confidence || 0,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message,
    });
  }
});

module.exports = router;
