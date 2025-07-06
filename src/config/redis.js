const Redis = require('redis');
const {logger} = require('./logger');

// Redis client configuration
const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`;
const redisClient = Redis.createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: retries => Math.min(retries * 50, 1000),
  },
});

// Handle Redis events
redisClient.on('connect', () => {
  logger.info('✅ Connected to Redis server');
});

redisClient.on('error', err => {
  logger.error('❌ Redis connection error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('🔄 Reconnecting to Redis...');
});

// Connect to Redis
(async() => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
  }
})();

// Cache helper functions
const cacheHelpers = {
  // Set data in cache with expiration
  async set(key, value, expireSeconds = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(key, expireSeconds, serializedValue);
      logger.debug('Cache set successfully', {key, expireSeconds});
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  },

  // Get data from cache
  async get(key) {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;

      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  // Delete data from cache
  async delete(key) {
    try {
      await redisClient.del(key);
      logger.debug('Cache deleted successfully', {key});
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  },

  // Clear all cache
  async clear() {
    try {
      await redisClient.flushAll();
      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  },

  // Generate cache key
  generateKey(...parts) {
    return parts.join(':');
  },

  // Add a key to a set
  async setAdd(setKey, key) {
    try {
      await redisClient.sAdd(setKey, key);
      return true;
    } catch (error) {
      logger.error('Cache setAdd error:', {setKey, key, error});
      return false;
    }
  },

  // Get all keys from a set
  async setMembers(setKey) {
    try {
      const members = await redisClient.sMembers(setKey);
      return members;
    } catch (error) {
      logger.error('Cache setMembers error:', {setKey, error});
      return [];
    }
  },
};

module.exports = {redisClient, cacheHelpers};
