const tf = require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');
const { Canvas, Image, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs').promises;

// Configure face-api.js to use canvas
faceapi.env.monkeyPatch({ Canvas, Image });

class FaceRecognitionService {
  constructor() {
    this.modelsLoaded = false;
    this.modelsPath = path.join(__dirname, '../../models');
  }

  // Load face-api.js models
  async loadModels() {
    if (this.modelsLoaded) {
      return true;
    }

    try {
      console.log('🔄 Loading face-api.js models...');
      
      // Check if models directory exists
      try {
        await fs.access(this.modelsPath);
      } catch (error) {
        console.log('📁 Models directory not found, creating...');
        await fs.mkdir(this.modelsPath, { recursive: true });
        console.log('⚠️  Please download face-api.js models to ./models directory');
        console.log('📥 Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights');
        return false;
      }

      // Load models
      await faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath);

      this.modelsLoaded = true;
      console.log('✅ Face-api.js models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Error loading models:', error.message);
      return false;
    }
  }

  // Load image from file path
  async loadImage(imagePath) {
    try {
      // Use canvas.loadImage for Node.js compatibility
      const image = await loadImage(imagePath);
      return image;
    } catch (error) {
      console.error('DEBUG: loadImage error', error);
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }

  // Detect faces in image
  async detectFaces(imagePath) {
    try {
      const image = await this.loadImage(imagePath);
      const detections = await faceapi
        .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      return detections;
    } catch (error) {
      throw new Error(`Face detection failed: ${error.message}`);
    }
  }

  // Extract face descriptor from image
  async extractFaceDescriptor(imagePath) {
    try {
      const detections = await this.detectFaces(imagePath);
      
      if (detections.length === 0) {
        throw new Error('No faces detected in the image');
      }
      
      if (detections.length > 1) {
        throw new Error('Multiple faces detected. Please upload an image with only one face');
      }

      const detection = detections[0];
      return {
        descriptor: Array.from(detection.descriptor),
        landmarks: detection.landmarks,
        detection: detection.detection
      };
    } catch (error) {
      throw new Error(`Face extraction failed: ${error.message}`);
    }
  }

  // Compare two face descriptors
  compareFaces(descriptor1, descriptor2, threshold = 0.6) {
    try {
      const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
      const similarity = 1 - distance;
      
      return {
        distance,
        similarity,
        isMatch: similarity >= threshold,
        threshold
      };
    } catch (error) {
      throw new Error(`Face comparison failed: ${error.message}`);
    }
  }

  // Recognize face against database
  async recognizeFace(imagePath, storedFaces, threshold = 0.6) {
    try {
      const { descriptor } = await this.extractFaceDescriptor(imagePath);
      
      let bestMatch = null;
      let highestSimilarity = 0;

      for (const storedFace of storedFaces) {
        const storedDescriptor = JSON.parse(storedFace.descriptor);
        const comparison = this.compareFaces(descriptor, storedDescriptor, threshold);
        
        if (comparison.similarity > highestSimilarity) {
          highestSimilarity = comparison.similarity;
          bestMatch = {
            ...storedFace,
            similarity: comparison.similarity,
            distance: comparison.distance
          };
        }
      }

      return {
        recognized: bestMatch && bestMatch.similarity >= threshold,
        match: bestMatch,
        confidence: highestSimilarity
      };
    } catch (error) {
      throw new Error(`Face recognition failed: ${error.message}`);
    }
  }

  // Validate image for face recognition
  async validateImage(imagePath) {
    try {
      const detections = await this.detectFaces(imagePath);
      
      if (detections.length === 0) {
        return { valid: false, error: 'No faces detected in the image' };
      }
      
      if (detections.length > 1) {
        return { valid: false, error: 'Multiple faces detected. Please upload an image with only one face' };
      }

      const detection = detections[0];
      const { width, height } = detection.detection.box;
      
      // Check minimum face size
      const minSize = 50;
      if (width < minSize || height < minSize) {
        return { valid: false, error: 'Face is too small. Please upload a higher resolution image' };
      }

      return { valid: true, detection };
    } catch (error) {
      return { valid: false, error: `Image validation failed: ${error.message}` };
    }
  }

  // Get face detection statistics
  async getFaceStats(imagePath) {
    try {
      const detections = await this.detectFaces(imagePath);
      
      return {
        faceCount: detections.length,
        faces: detections.map(detection => ({
          confidence: detection.detection.score,
          box: detection.detection.box,
          landmarks: detection.landmarks
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get face stats: ${error.message}`);
    }
  }
}

module.exports = new FaceRecognitionService(); 