const faceRecognitionService = require('../services/faceRecognitionService');
const {dbHelpers} = require('../config/database');
const {validationResult} = require('express-validator');
const {cacheHelpers} = require('../config/redis');
const crypto = require('crypto');
const fs = require('fs').promises;

class FaceController {
  // Enroll new face
  async enroll(req, res) {
    try {
      // Check if models are loaded
      const modelsLoaded = await faceRecognitionService.loadModels();
      if (!modelsLoaded) {
        return res.status(503).json({
          error: 'Face recognition models not loaded. Please check models directory.',
        });
      }

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No image file provided',
        });
      }

      const {name} = req.body;
      const imagePath = req.file.processedPath || req.file.path;

      // Validate image for face recognition
      const validation = await faceRecognitionService.validateImage(imagePath);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
        });
      }

      // Extract face descriptor
      const {descriptor} = await faceRecognitionService.extractFaceDescriptor(imagePath);

      // Check if face already exists (optional - for duplicate prevention)
      const existingFaces = await dbHelpers.getAllFaces();
      for (const existingFace of existingFaces) {
        const storedDescriptor = JSON.parse(existingFace.descriptor);
        const comparison = faceRecognitionService.compareFaces(descriptor, storedDescriptor, 0.7);

        if (comparison.isMatch) {
          return res.status(409).json({
            error: 'Face already exists in database',
            existingFace: {
              id: existingFace.id,
              name: existingFace.name,
              similarity: comparison.similarity,
            },
          });
        }
      }

      // Save to database
      const result = await dbHelpers.insertFace(name, JSON.stringify(descriptor), imagePath);

      // --- Targeted Cache Invalidation ---
      const unrecognizedCacheKey = 'unrecognized_keys';
      const keysToClear = await cacheHelpers.setMembers(unrecognizedCacheKey);
      if (keysToClear && keysToClear.length > 0) {
        await cacheHelpers.delete(keysToClear);
        await cacheHelpers.delete(unrecognizedCacheKey); // Clear the set itself
      }
      // --- End Targeted Cache Invalidation ---

      res.status(201).json({
        message: 'Face enrolled successfully',
        data: {
          id: result.id,
          name: result.name,
          imagePath: result.imagePath,
          confidence: validation.detection.score,
        },
      });
    } catch (error) {
      console.error('Enroll error:', error);
      res.status(500).json({
        error: 'Failed to enroll face',
        details: error.message,
      });
    }
  }

  // Recognize face
  async recognize(req, res) {
    try {
      // Check if models are loaded
      const modelsLoaded = await faceRecognitionService.loadModels();
      if (!modelsLoaded) {
        return res.status(503).json({
          error: 'Face recognition models not loaded. Please check models directory.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No image file provided',
        });
      }

      // Tentukan sumber image: buffer (live recognize) atau file path (default)
      const imageInput = req.file.buffer || req.file.processedPath || req.file.path;

      // --- Caching Logic: Check before processing ---
      let imageBuffer, imageHash, cacheKey, cachedResult;
      if (!req.file.buffer) { // hanya cache jika file di disk
        imageBuffer = await fs.readFile(imageInput);
        imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        cacheKey = cacheHelpers.generateKey('recognition', imageHash);
        cachedResult = await cacheHelpers.get(cacheKey);
        if (cachedResult) {
          // Cache Hit!
          return res.json({
            ...cachedResult,
            source: 'cache',
          });
        }
      }
      // --- End Caching Logic ---

      // Validate image for face recognition
      const validation = await faceRecognitionService.validateImage(imageInput);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
        });
      }

      // Get all stored faces
      const storedFaces = await dbHelpers.getAllFaces();

      if (storedFaces.length === 0) {
        return res.status(404).json({
          error: 'No faces found in database. Please enroll some faces first.',
        });
      }

      // Recognize face
      const recognition = await faceRecognitionService.recognizeFace(imageInput, storedFaces, 0.6);

      let responsePayload;

      if (recognition.recognized) {
        // Log successful recognition (hanya jika file di disk)
        if (!req.file.buffer) {
          await dbHelpers.logRecognition(recognition.match.id, recognition.confidence, imageInput);
        }
        // Ambil bounding box dari hasil extractFaceDescriptor
        const {detection} = await faceRecognitionService.extractFaceDescriptor(imageInput);
        const box = detection && detection.box
          ? {
              x: detection.box.x,
              y: detection.box.y,
              width: detection.box.width,
              height: detection.box.height,
            }
          : null;
        responsePayload = {
          message: 'Face recognized successfully',
          data: {
            recognized: true,
            person: {
              id: recognition.match.id,
              name: recognition.match.name,
              confidence: recognition.confidence,
              similarity: recognition.match.similarity,
              box,
            },
            imagePath: req.file.buffer ? undefined : imageInput,
          },
        };
      } else {
        responsePayload = {
          message: 'Face not recognized',
          data: {
            recognized: false,
            confidence: recognition.confidence,
            imagePath: req.file.buffer ? undefined : imageInput,
          },
        };
      }

      // --- Caching Logic: Save after processing (hanya jika file di disk) ---
      if (!req.file.buffer) {
        // Set cache to expire in 1 hour (3600 seconds)
        await cacheHelpers.set(cacheKey, responsePayload, 3600);
        // If not recognized, add key to the set of unrecognized keys
        if (!recognition.recognized) {
          await cacheHelpers.setAdd('unrecognized_keys', cacheKey);
        }
      }

      res.json({
        ...responsePayload,
        source: 'live',
      });
    } catch (error) {
      console.error('Recognize error:', error);
      res.status(500).json({
        error: 'Failed to recognize face',
        details: error.message,
      });
    }
  }

  // Get dashboard data
  async dashboard(req, res) {
    try {
      // Get statistics
      const stats = await dbHelpers.getStats();
      const faces = await dbHelpers.getAllFaces();

      // Get recent recognition logs
      const recentLogs = await new Promise((resolve, reject) => {
        const {db} = require('../config/database');
        db.all(
          `
          SELECT 
            rl.*,
            f.name as person_name
          FROM recognition_logs rl
          LEFT JOIN faces f ON rl.face_id = f.id
          ORDER BY rl.created_at DESC
          LIMIT 10
        `,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          },
        );
      });

      res.json({
        stats: {
          totalFaces: stats.total_faces || 0,
          uniqueFacesRecognized: stats.unique_faces_recognized || 0,
          averageConfidence: stats.avg_confidence || 0,
        },
        faces: faces.map(face => ({
          id: face.id,
          name: face.name,
          imagePath: face.image_path,
          createdAt: face.created_at,
        })),
        recentLogs: recentLogs.map(log => ({
          id: log.id,
          personName: log.person_name,
          confidence: log.confidence,
          imagePath: log.image_path,
          createdAt: log.created_at,
        })),
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'Failed to get dashboard data',
        details: error.message,
      });
    }
  }

  // Delete face
  async deleteFace(req, res) {
    try {
      const {id} = req.params;

      const face = await dbHelpers.getFaceById(id);
      if (!face) {
        return res.status(404).json({
          error: 'Face not found',
        });
      }

      // Delete from database
      const result = await dbHelpers.deleteFace(id);

      if (result.deleted) {
        res.json({
          message: 'Face deleted successfully',
          data: {id: parseInt(id, 10)},
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete face',
        });
      }
    } catch (error) {
      console.error('Delete face error:', error);
      res.status(500).json({
        error: 'Failed to delete face',
        details: error.message,
      });
    }
  }

  // Get face by ID
  async getFace(req, res) {
    try {
      const {id} = req.params;

      const face = await dbHelpers.getFaceById(id);
      if (!face) {
        return res.status(404).json({
          error: 'Face not found',
        });
      }

      res.json({
        data: {
          id: face.id,
          name: face.name,
          imagePath: face.image_path,
          createdAt: face.created_at,
          updatedAt: face.updated_at,
        },
      });
    } catch (error) {
      console.error('Get face error:', error);
      res.status(500).json({
        error: 'Failed to get face',
        details: error.message,
      });
    }
  }
}

module.exports = new FaceController();
