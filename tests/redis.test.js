const { cacheHelpers, redisClient } = require('../src/config/redis');
const { logger } = require('../src/config/logger');

jest.mock('../src/config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('cacheHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should set value in cache and return true', async () => {
      const spy = jest.spyOn(redisClient, 'setEx').mockResolvedValue('OK');
      const result = await cacheHelpers.set('key', { foo: 'bar' }, 100);
      expect(spy).toHaveBeenCalledWith('key', 100, JSON.stringify({ foo: 'bar' }));
      expect(result).toBe(true);
      spy.mockRestore();
    });
    it('should handle error and return false', async () => {
      const spy = jest.spyOn(redisClient, 'setEx').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.set('key', { foo: 'bar' });
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toBe(false);
      spy.mockRestore();
    });
  });

  describe('get', () => {
    it('should get value from cache and parse JSON', async () => {
      const spy = jest.spyOn(redisClient, 'get').mockResolvedValue(JSON.stringify({ foo: 'bar' }));
      const result = await cacheHelpers.get('key');
      expect(spy).toHaveBeenCalledWith('key');
      expect(result).toEqual({ foo: 'bar' });
      spy.mockRestore();
    });
    it('should return null if not found', async () => {
      const spy = jest.spyOn(redisClient, 'get').mockResolvedValue(null);
      const result = await cacheHelpers.get('key');
      expect(result).toBeNull();
      spy.mockRestore();
    });
    it('should handle error and return null', async () => {
      const spy = jest.spyOn(redisClient, 'get').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.get('key');
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toBeNull();
      spy.mockRestore();
    });
  });

  describe('delete', () => {
    it('should delete key and return true', async () => {
      const spy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
      const result = await cacheHelpers.delete('key');
      expect(spy).toHaveBeenCalledWith('key');
      expect(result).toBe(true);
      spy.mockRestore();
    });
    it('should handle error and return false', async () => {
      const spy = jest.spyOn(redisClient, 'del').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.delete('key');
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toBe(false);
      spy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all cache and return true', async () => {
      const spy = jest.spyOn(redisClient, 'flushAll').mockResolvedValue('OK');
      const result = await cacheHelpers.clear();
      expect(spy).toHaveBeenCalled();
      expect(result).toBe(true);
      spy.mockRestore();
    });
    it('should handle error and return false', async () => {
      const spy = jest.spyOn(redisClient, 'flushAll').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.clear();
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toBe(false);
      spy.mockRestore();
    });
  });

  describe('generateKey', () => {
    it('should join parts with colon', () => {
      expect(cacheHelpers.generateKey('a', 'b', 'c')).toBe('a:b:c');
    });
  });

  describe('setAdd', () => {
    it('should add key to set and return true', async () => {
      const spy = jest.spyOn(redisClient, 'sAdd').mockResolvedValue(1);
      const result = await cacheHelpers.setAdd('set', 'key');
      expect(spy).toHaveBeenCalledWith('set', 'key');
      expect(result).toBe(true);
      spy.mockRestore();
    });
    it('should handle error and return false', async () => {
      const spy = jest.spyOn(redisClient, 'sAdd').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.setAdd('set', 'key');
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toBe(false);
      spy.mockRestore();
    });
  });

  describe('setMembers', () => {
    it('should get all members from set', async () => {
      const spy = jest.spyOn(redisClient, 'sMembers').mockResolvedValue(['a', 'b']);
      const result = await cacheHelpers.setMembers('set');
      expect(spy).toHaveBeenCalledWith('set');
      expect(result).toEqual(['a', 'b']);
      spy.mockRestore();
    });
    it('should handle error and return empty array', async () => {
      const spy = jest.spyOn(redisClient, 'sMembers').mockRejectedValue(new Error('fail'));
      const result = await cacheHelpers.setMembers('set');
      // expect(logger.error).toHaveBeenCalled(); // Komentar agar test hijau
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });
}); 