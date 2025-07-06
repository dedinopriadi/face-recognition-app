const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Initialize database
require('./config/database');

// Initialize Redis
require('./config/redis');

// Initialize logger
const {logger, logHelpers} = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ['\'self\''],
      frameSrc: [
        '\'self\'',
        'https://ko-fi.com',
        'https://storage.ko-fi.com',
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
      ],
      frameAncestors: ['\'self\'', 'https://ko-fi.com'],
      scriptSrc: [
        '\'self\'',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://storage.ko-fi.com',
        'https://ko-fi.com',
        'https://cdn.ko-fi.com',
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://www.paypalobjects.com',
        '\'unsafe-inline\'',
      ],
      styleSrc: [
        '\'self\'',
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://storage.ko-fi.com',
        'https://ko-fi.com',
        'https://cdn.ko-fi.com',
        '\'unsafe-inline\'',
      ],
      fontSrc: [
        '\'self\'',
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      imgSrc: [
        '\'self\'',
        'data:',
        'blob:',
        'https://storage.ko-fi.com',
        'https://ko-fi.com',
        'https://cdn.ko-fi.com',
        'https://www.paypal.com',
        'https://www.paypalobjects.com',
      ],
      connectSrc: [
        '\'self\'',
        'https://www.paypal.com',
        'https://www.paypalobjects.com',
        'https://api.paypal.com',
        'https://api.sandbox.paypal.com',
      ],
      objectSrc: ['\'none\''],
      upgradeInsecureRequests: [],
    },
  }),
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  // limit each IP to 100 requests per window
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    logHelpers.security('Rate limit exceeded', {ip: req.ip});
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(
        parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) / 1000,
      ),
    });
  },
});
app.use('/api/', limiter);

// Basic Middleware
app.use(compression());

// Custom Morgan middleware for logging
app.use((req, res, _next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logHelpers.api(req.method, req.path, res.statusCode, duration, req.ip);
  });
  _next();
});

app.use(morgan('combined', {stream: logger.stream}));

app.use(express.json({limit: process.env.MAX_FILE_SIZE || '10mb'}));
app.use(express.urlencoded({extended: true, limit: process.env.MAX_FILE_SIZE || '10mb'}));

// Static Files
app.use('/static', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from public directory
app.use(express.static('public'));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Web Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Face Recognition App',
    message: 'Welcome to Face Recognition Application',
    activePage: 'home',
  });
});

app.get('/enroll', (req, res) => {
  res.render('enroll', {
    title: 'Enroll Face - Face Recognition App',
    activePage: 'enroll',
  });
});

app.get('/recognize', (req, res) => {
  res.render('recognize', {
    title: 'Recognize Face - Face Recognition App',
    activePage: 'recognize',
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'About - Face Recognition App',
    activePage: 'about',
  });
});

// API Routes
app.get('/api/status', async(req, res) => {
  let redisStatus = 'disconnected';
  try {
    if (redisClient && redisClient.isOpen) {
      redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    } else if (redisClient && redisClient.status) {
      redisStatus = redisClient.status;
    }
  } catch (e) {
    redisStatus = 'error';
  }
  res.json({
    message: 'Face Recognition API is running',
    status: 'up',
    version: packageJson.version,
    uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    redisStatus,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Face Recognition Routes
const faceRoutes = require('./routes/faceRoutes');
app.use('/api/face', faceRoutes);

const {redisClient} = require('./config/redis');
const packageJson = require('../package.json');

app.get('/api-status', async(req, res) => {
  let redisStatus = 'disconnected';
  try {
    if (redisClient && redisClient.isOpen) {
      redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    } else if (redisClient && redisClient.status) {
      redisStatus = redisClient.status;
    }
  } catch (e) {
    redisStatus = 'error';
  }
  res.render('api-status', {
    title: 'API Status - Face Recognition App',
    status: 'up',
    version: packageJson.version,
    uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    redisStatus,
    activePage: 'api-status',
  });
});

// 404 Handler
app.use('*', (req, res) => {
  // Check if it's an API request
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl,
    });
  }
  // For web routes, render 404 page
  res.status(404).render('404', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    activePage: null,
  });
});

// Error Handler
app.use((err, req, res, _next) => {
  req.app.get('logger')?.error('Unhandled error', {error: err.message, stack: err.stack});
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  logger.info('🚀 Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });

  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 App URL: http://localhost:${PORT}`);
  console.log(`🔍 Face Recognition API: http://localhost:${PORT}/api/face/health`);
  console.log(`📝 Enroll page: http://localhost:${PORT}/enroll`);
  console.log(`🔍 Recognize page: http://localhost:${PORT}/recognize`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
