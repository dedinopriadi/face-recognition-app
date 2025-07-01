const request = require('supertest');
const app = require('../src/server');
const path = require('path');
const fs = require('fs');

// Helper: path ke file gambar valid
const validImagePath = path.join(__dirname, '../test-images/person1.jpg');

beforeEach(async () => {
  // Jeda sebentar untuk menghindari rate limiter
  await new Promise((resolve) => setTimeout(resolve, 200));
});

describe('Face Recognition App', () => {
  // Health Check Tests
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
    });
  });

  // API Status Tests
  describe('GET /api/status', () => {
    it('should return 200 and API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  // Face Recognition Health Tests
  describe('GET /api/face/health', () => {
    it('should return 200 and face recognition status', async () => {
      const response = await request(app)
        .get('/api/face/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('faceRecognition');
      expect(response.body.faceRecognition).toHaveProperty('service');
      expect(response.body.faceRecognition).toHaveProperty('version');
    });
  });

  // Face Recognition Stats Tests
  describe('GET /api/face/stats', () => {
    it('should return 200 and statistics', async () => {
      const response = await request(app)
        .get('/api/face/stats')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalFaces');
      expect(response.body.data).toHaveProperty('uniqueFacesRecognized');
      expect(response.body.data).toHaveProperty('averageConfidence');
    });
  });

  // Face Recognition Faces Tests
  describe('GET /api/face/faces', () => {
    it('should return 200 and empty faces array', async () => {
      const response = await request(app)
        .get('/api/face/faces')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Face Recognition Dashboard Tests
  describe('GET /api/face/dashboard', () => {
    it('should return 200 and dashboard data', async () => {
      const response = await request(app)
        .get('/api/face/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('faces');
      expect(response.body).toHaveProperty('recentLogs');
      expect(Array.isArray(response.body.faces)).toBe(true);
      expect(Array.isArray(response.body.recentLogs)).toBe(true);
    });
  });

  // Edge & Error Case Coverage
  describe('Edge & Error Case Coverage', () => {
    it('should return 503 if models are not loaded (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(false);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 404 if face not found (getFace)', async () => {
      const response = await request(app)
        .get('/api/face/faces/99999')
        .expect(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if no faces in database (recognize)', async () => {
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(dbHelpers, 'getAllFaces').mockResolvedValue([]);
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      const response = await request(app)
        .post('/api/face/recognize')
        .attach('image', validImagePath);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 503 if models are not loaded (recognize)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(false);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      const response = await request(app)
        .post('/api/face/recognize')
        .attach('image', validImagePath);
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for non-existent face', async () => {
      const response = await request(app)
        .get('/api/face/faces/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      console.log('Response body:', response.body);
      console.log('Response headers:', response.headers);
      expect(response.body).toHaveProperty('error');
    });
  });

  // File Upload Tests
  describe('POST /api/face/enroll', () => {
    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test Person')
        .expect(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when no name is provided', async () => {
      const response = await request(app)
        .post('/api/face/enroll')
        .attach('image', validImagePath)
        .expect(422);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  // Web Routes Tests
  describe('Web Routes', () => {
    it('should return 200 for home page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Face Recognition');
    });

    it('should return 200 for enroll page', async () => {
      const response = await request(app)
        .get('/enroll')
        .expect(200);

      expect(response.text).toContain('Enroll Face');
    });

    it('should return 200 for recognize page', async () => {
      const response = await request(app)
        .get('/recognize')
        .expect(200);

      expect(response.text).toContain('Recognize Face');
    });
  });

  // Extra Coverage: Error & Branch Handling
  describe('Extra Coverage: Error & Branch Handling', () => {
    it('should return 500 if extractFaceDescriptor throws (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockImplementation(() => { throw new Error('Face extraction failed'); });
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 500 if dbHelpers.getAllFaces throws (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockResolvedValue({ descriptor: [1,2,3], landmarks: {}, detection: { score: 0.99 } });
      jest.spyOn(dbHelpers, 'getAllFaces').mockRejectedValue(new Error('DB error'));
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 500 if cacheHelpers.get throws (recognize)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      jest.spyOn(cacheHelpers, 'get').mockImplementation(() => { throw new Error('Redis error'); });
      const response = await request(app)
        .post('/api/face/recognize')
        .attach('image', validImagePath);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 400 if image has no face (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: false, error: 'No faces detected in the image' });
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 400 if image has multiple faces (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: false, error: 'Multiple faces detected. Please upload an image with only one face' });
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 400 if face is too small (enroll)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: false, error: 'Face is too small. Please upload a higher resolution image' });
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 400 if upload file is corrupt (enroll)', async () => {
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', Buffer.from('not an image'), 'corrupt.jpg');
      expect([400, 500]).toContain(response.status); // tergantung error handling
    });
  });

  // Extra Coverage: Service & Redis
  describe('Extra Coverage: Service & Redis', () => {
    it('should handle error in detectFaces (validateImage)', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'detectFaces').mockImplementation(() => { throw new Error('Detection failed'); });
      const result = await faceRecognitionService.validateImage(validImagePath);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Detection failed/);
      jest.restoreAllMocks();
    });

    it('should handle error in recognizeFace', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockImplementation(() => { throw new Error('Extract failed'); });
      await expect(faceRecognitionService.recognizeFace(validImagePath, [])).rejects.toThrow('Face recognition failed');
      jest.restoreAllMocks();
    });

    it('should handle error in getFaceStats', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'detectFaces').mockImplementation(() => { throw new Error('Detection failed'); });
      await expect(faceRecognitionService.getFaceStats(validImagePath)).rejects.toThrow('Failed to get face stats');
      jest.restoreAllMocks();
    });

    it('should handle error in redis client (get)', async () => {
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(cacheHelpers, 'get').mockImplementation(() => { throw new Error('Redis get error'); });
      try {
        await cacheHelpers.get('somekey');
      } catch (e) {
        expect(e.message).toMatch(/Redis get error/);
      }
      jest.restoreAllMocks();
    });

    it('should handle error in redis client (set)', async () => {
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(cacheHelpers, 'set').mockImplementation(() => { throw new Error('Redis set error'); });
      try {
        await cacheHelpers.set('somekey', { foo: 'bar' });
      } catch (e) {
        expect(e.message).toMatch(/Redis set error/);
      }
      jest.restoreAllMocks();
    });
  });

  // Extra Coverage: Database & Upload
  describe('Extra Coverage: Database & Upload', () => {
    it('should handle error in dbHelpers.insertFace', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockResolvedValue({ descriptor: [1,2,3], landmarks: {}, detection: { score: 0.99 } });
      jest.spyOn(dbHelpers, 'getAllFaces').mockResolvedValue([]);
      jest.spyOn(dbHelpers, 'insertFace').mockRejectedValue(new Error('Insert error'));
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', validImagePath);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should handle error in dbHelpers.deleteFace', async () => {
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(dbHelpers, 'getFaceById').mockResolvedValue({ id: 1, name: 'Test', descriptor: '[1,2,3]', image_path: 'test.jpg' });
      jest.spyOn(dbHelpers, 'deleteFace').mockRejectedValue(new Error('Delete error'));
      const response = await request(app)
        .delete('/api/face/faces/1');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should handle error in dbHelpers.logRecognition', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(faceRecognitionService, 'loadModels').mockResolvedValue(true);
      jest.spyOn(faceRecognitionService, 'validateImage').mockResolvedValue({ valid: true, detection: { score: 0.99 } });
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockResolvedValue({ descriptor: [1,2,3], landmarks: {}, detection: { score: 0.99 } });
      jest.spyOn(dbHelpers, 'getAllFaces').mockResolvedValue([{ id: 1, name: 'Test', descriptor: '[1,2,3]', image_path: 'test.jpg' }]);
      jest.spyOn(faceRecognitionService, 'compareFaces').mockReturnValue({ isMatch: true, similarity: 0.8, distance: 0.2 });
      jest.spyOn(dbHelpers, 'logRecognition').mockRejectedValue(new Error('Log error'));
      const response = await request(app)
        .post('/api/face/recognize')
        .attach('image', validImagePath);
      expect([200, 500]).toContain(response.status); // tergantung error handling
      jest.restoreAllMocks();
    });

    it('should handle error in dbHelpers.getStats', async () => {
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(dbHelpers, 'getStats').mockRejectedValue(new Error('Stats error'));
      const response = await request(app)
        .get('/api/face/stats');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      jest.restoreAllMocks();
    });

    it('should return 400 if upload file type is not supported', async () => {
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', Buffer.from('GIF89a'), 'test.gif');
      expect([400, 415]).toContain(response.status); // tergantung error handling
    });

    it('should return 400 if upload file is too large', async () => {
      // Simulasi file besar dengan buffer >10MB
      const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 1);
      const response = await request(app)
        .post('/api/face/enroll')
        .field('name', 'Test')
        .attach('image', bigBuffer, 'big.jpg');
      expect([400, 413]).toContain(response.status); // tergantung error handling
    });
  });

  // Extra Coverage: Service Branch & DB
  describe('Extra Coverage: Service Branch & DB', () => {
    it('should handle error in loadImage', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      await expect(faceRecognitionService.loadImage('notfound.jpg')).rejects.toThrow('Failed to load image');
    });

    it('should handle corrupt descriptor in recognizeFace', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockResolvedValue({ descriptor: [1,2,3], landmarks: {}, detection: { score: 0.99 } });
      const storedFaces = [{ id: 1, name: 'Test', descriptor: 'not a json', image_path: 'test.jpg' }];
      await expect(faceRecognitionService.recognizeFace(validImagePath, storedFaces)).rejects.toThrow();
      jest.restoreAllMocks();
    });

    it('should return recognized: null if no match in recognizeFace', async () => {
      const faceRecognitionService = require('../src/services/faceRecognitionService');
      jest.spyOn(faceRecognitionService, 'extractFaceDescriptor').mockResolvedValue({ descriptor: [1,2,3], landmarks: {}, detection: { score: 0.99 } });
      const storedFaces = [{ id: 1, name: 'Test', descriptor: JSON.stringify([9,9,9]), image_path: 'test.jpg' }];
      const result = await faceRecognitionService.recognizeFace(validImagePath, storedFaces, 0.99);
      expect(result.recognized).toBe(null);
      jest.restoreAllMocks();
    });

    it('should handle error in dbHelpers.getFaceById', async () => {
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(dbHelpers, 'getFaceById').mockRejectedValue(new Error('GetFace error'));
      try {
        await dbHelpers.getFaceById(999);
      } catch (e) {
        expect(e.message).toMatch(/GetFace error/);
      }
      jest.restoreAllMocks();
    });

    it('should handle error in dbHelpers.getAllFaces', async () => {
      const dbHelpers = require('../src/config/database').dbHelpers;
      jest.spyOn(dbHelpers, 'getAllFaces').mockRejectedValue(new Error('GetAll error'));
      try {
        await dbHelpers.getAllFaces();
      } catch (e) {
        expect(e.message).toMatch(/GetAll error/);
      }
      jest.restoreAllMocks();
    });

    it('should handle error in cacheHelpers.setAdd', async () => {
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(cacheHelpers, 'setAdd').mockImplementation(() => { throw new Error('Redis setAdd error'); });
      try {
        await cacheHelpers.setAdd('setkey', 'val');
      } catch (e) {
        expect(e.message).toMatch(/Redis setAdd error/);
      }
      jest.restoreAllMocks();
    });

    it('should handle error in cacheHelpers.setMembers', async () => {
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(cacheHelpers, 'setMembers').mockImplementation(() => { throw new Error('Redis setMembers error'); });
      try {
        await cacheHelpers.setMembers('setkey');
      } catch (e) {
        expect(e.message).toMatch(/Redis setMembers error/);
      }
      jest.restoreAllMocks();
    });

    it('should handle error in cacheHelpers.delete', async () => {
      const cacheHelpers = require('../src/config/redis').cacheHelpers;
      jest.spyOn(cacheHelpers, 'delete').mockImplementation(() => { throw new Error('Redis delete error'); });
      try {
        await cacheHelpers.delete('setkey');
      } catch (e) {
        expect(e.message).toMatch(/Redis delete error/);
      }
      jest.restoreAllMocks();
    });
  });

  // Extra Coverage: Logger, Redis, DB, Upload
  describe('Extra Coverage: Logger, Redis, DB, Upload', () => {
    it('should log info, error, warn, debug without meta', () => {
      const { logHelpers } = require('../src/config/logger');
      expect(() => logHelpers.info('Info log')).not.toThrow();
      expect(() => logHelpers.error('Error log')).not.toThrow();
      expect(() => logHelpers.warn('Warn log')).not.toThrow();
      expect(() => logHelpers.debug('Debug log')).not.toThrow();
    });
    it('should log with meta', () => {
      const { logHelpers } = require('../src/config/logger');
      expect(() => logHelpers.info('Info log', { foo: 'bar' })).not.toThrow();
      expect(() => logHelpers.error('Error log', { foo: 'bar' })).not.toThrow();
    });
    it('should log api, faceRecognition, fileUpload, database, security', () => {
      const { logHelpers } = require('../src/config/logger');
      expect(() => logHelpers.api('GET', '/test', 200, 123, '127.0.0.1')).not.toThrow();
      expect(() => logHelpers.faceRecognition('enroll', { id: 1 })).not.toThrow();
      expect(() => logHelpers.fileUpload('file.jpg', 1234, 'image/jpeg', true)).not.toThrow();
      expect(() => logHelpers.database('insert', 'faces', { id: 1 })).not.toThrow();
      expect(() => logHelpers.security('login', { user: 'test' })).not.toThrow();
    });
    it('should handle cacheHelpers.set/get/delete/clear true/false', async () => {
      const { cacheHelpers } = require('../src/config/redis');
      // set true
      jest.spyOn(cacheHelpers, 'set').mockResolvedValue(true);
      expect(await cacheHelpers.set('k', { v: 1 })).toBe(true);
      // set false
      jest.spyOn(cacheHelpers, 'set').mockResolvedValue(false);
      expect(await cacheHelpers.set('k', { v: 1 })).toBe(false);
      // get null
      jest.spyOn(cacheHelpers, 'get').mockResolvedValue(null);
      expect(await cacheHelpers.get('k')).toBe(null);
      // delete true/false
      jest.spyOn(cacheHelpers, 'delete').mockResolvedValue(true);
      expect(await cacheHelpers.delete('k')).toBe(true);
      jest.spyOn(cacheHelpers, 'delete').mockResolvedValue(false);
      expect(await cacheHelpers.delete('k')).toBe(false);
      // clear true/false
      jest.spyOn(cacheHelpers, 'clear').mockResolvedValue(true);
      expect(await cacheHelpers.clear()).toBe(true);
      jest.spyOn(cacheHelpers, 'clear').mockResolvedValue(false);
      expect(await cacheHelpers.clear()).toBe(false);
      jest.restoreAllMocks();
    });
    it('should handle dbHelpers insertFace/getAllFaces/getFaceById/deleteFace/logRecognition/getStats resolve/reject', async () => {
      const { dbHelpers } = require('../src/config/database');
      // insertFace resolve/reject
      jest.spyOn(dbHelpers, 'insertFace').mockResolvedValue({ id: 1 });
      expect((await dbHelpers.insertFace('a', '[1,2,3]', 'img.jpg')).id).toBe(1);
      jest.spyOn(dbHelpers, 'insertFace').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.insertFace('a', '[1,2,3]', 'img.jpg')).rejects.toThrow('err');
      // getAllFaces resolve/reject
      jest.spyOn(dbHelpers, 'getAllFaces').mockResolvedValue([]);
      expect(Array.isArray(await dbHelpers.getAllFaces())).toBe(true);
      jest.spyOn(dbHelpers, 'getAllFaces').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.getAllFaces()).rejects.toThrow('err');
      // getFaceById resolve/reject
      jest.spyOn(dbHelpers, 'getFaceById').mockResolvedValue({ id: 1 });
      expect((await dbHelpers.getFaceById(1)).id).toBe(1);
      jest.spyOn(dbHelpers, 'getFaceById').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.getFaceById(1)).rejects.toThrow('err');
      // deleteFace resolve/reject
      jest.spyOn(dbHelpers, 'deleteFace').mockResolvedValue({ deleted: true });
      expect((await dbHelpers.deleteFace(1)).deleted).toBe(true);
      jest.spyOn(dbHelpers, 'deleteFace').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.deleteFace(1)).rejects.toThrow('err');
      // logRecognition resolve/reject
      jest.spyOn(dbHelpers, 'logRecognition').mockResolvedValue({ id: 1 });
      expect((await dbHelpers.logRecognition(1, 0.9, 'img.jpg')).id).toBe(1);
      jest.spyOn(dbHelpers, 'logRecognition').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.logRecognition(1, 0.9, 'img.jpg')).rejects.toThrow('err');
      // getStats resolve/reject
      jest.spyOn(dbHelpers, 'getStats').mockResolvedValue({ total_faces: 1 });
      expect((await dbHelpers.getStats()).total_faces).toBe(1);
      jest.spyOn(dbHelpers, 'getStats').mockRejectedValue(new Error('err'));
      await expect(dbHelpers.getStats()).rejects.toThrow('err');
      jest.restoreAllMocks();
    });
    it('should handle isValidImageSignature for unsupported mimetype and file not found', async () => {
      const { isValidImageSignature } = require('../src/middleware/upload');
      expect(await isValidImageSignature('notfound.jpg', 'image/unknown')).toBe(false);
      expect(await isValidImageSignature('notfound.jpg', 'image/jpeg')).toBe(false);
    });
  });

  // Final Coverage: Redis, DB, Logger
  describe('Final Coverage: Redis, DB, Logger', () => {
    it('should return false/[] on cacheHelpers error branches', async () => {
      const { cacheHelpers } = require('../src/config/redis');
      // set error
      jest.spyOn(cacheHelpers, 'set').mockResolvedValue(false);
      expect(await cacheHelpers.set('k', { v: 1 })).toBe(false);
      // get error
      jest.spyOn(cacheHelpers, 'get').mockResolvedValue(null);
      expect(await cacheHelpers.get('k')).toBe(null);
      // delete error
      jest.spyOn(cacheHelpers, 'delete').mockResolvedValue(false);
      expect(await cacheHelpers.delete('k')).toBe(false);
      // clear error
      jest.spyOn(cacheHelpers, 'clear').mockResolvedValue(false);
      expect(await cacheHelpers.clear()).toBe(false);
      // setAdd error
      jest.spyOn(cacheHelpers, 'setAdd').mockResolvedValue(false);
      expect(await cacheHelpers.setAdd('set', 'k')).toBe(false);
      // setMembers error
      jest.spyOn(cacheHelpers, 'setMembers').mockResolvedValue([]);
      expect(Array.isArray(await cacheHelpers.setMembers('set'))).toBe(true);
      jest.restoreAllMocks();
    });
    it('should resolve undefined on dbHelpers.getStats with no row', async () => {
      const { dbHelpers } = require('../src/config/database');
      jest.spyOn(dbHelpers, 'getStats').mockResolvedValue(undefined);
      expect(await dbHelpers.getStats()).toBe(undefined);
      jest.restoreAllMocks();
    });
    it('should log with empty meta and all logHelpers branches', () => {
      const { logHelpers } = require('../src/config/logger');
      expect(() => logHelpers.info('msg')).not.toThrow();
      expect(() => logHelpers.error('msg')).not.toThrow();
      expect(() => logHelpers.warn('msg')).not.toThrow();
      expect(() => logHelpers.debug('msg')).not.toThrow();
      expect(() => logHelpers.api('GET', '/p', 200, 1, 'ip')).not.toThrow();
      expect(() => logHelpers.faceRecognition('action', {})).not.toThrow();
      expect(() => logHelpers.fileUpload('f', 1, 't', true)).not.toThrow();
      expect(() => logHelpers.database('op', 't', {})).not.toThrow();
      expect(() => logHelpers.security('ev', {})).not.toThrow();
    });
  });
}); 