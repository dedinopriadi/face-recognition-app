const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'face-recognition-app' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper functions for different log levels
const logHelpers = {
  info: (message, meta = {}) => logger.info(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Log API requests
  api: (method, path, statusCode, responseTime, ip) => {
    logger.info('API Request', {
      method,
      path,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip,
      type: 'api'
    });
  },
  
  // Log face recognition events
  faceRecognition: (action, details) => {
    logger.info('Face Recognition Event', {
      action,
      ...details,
      type: 'face-recognition'
    });
  },
  
  // Log file upload events
  fileUpload: (filename, size, type, success) => {
    logger.info('File Upload Event', {
      filename,
      size: `${size} bytes`,
      type,
      success,
      type: 'file-upload'
    });
  },
  
  // Log database operations
  database: (operation, table, details) => {
    logger.info('Database Operation', {
      operation,
      table,
      ...details,
      type: 'database'
    });
  },
  
  // Log security events
  security: (event, details) => {
    logger.warn('Security Event', {
      event,
      ...details,
      type: 'security'
    });
  }
};

module.exports = { logger, logHelpers }; 