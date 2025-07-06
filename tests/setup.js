// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests
process.env.REDIS_URL = 'redis://localhost:6379'; // Set Redis URL for tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(15000);

// Note: Redis mocking is handled in individual test files
// to avoid conflicts between app tests and redis tests

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create test image buffer
  createTestImage: (width = 100, height = 100) => {
    // Create a simple test image buffer
    const buffer = Buffer.alloc(width * height * 3);
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = 255;     // Red
      buffer[i + 1] = 0;   // Green
      buffer[i + 2] = 0;   // Blue
    }
    return buffer;
  },
  
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create test request
  createTestRequest: (app, method, path) => {
    return require('supertest')(app)[method.toLowerCase()](path);
  }
}; 