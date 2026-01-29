/**
 * Cache Service
 * Redis caching strategies for improved performance
 */

const { getRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.redis = null;
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Initialize Redis client
   */
  async initialize() {
    if (!this.redis) {
      this.redis = await getRedisClient();
    }
    return this.redis;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      await this.initialize();
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.initialize();
      await this.redis.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      await this.initialize();
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'user:*')
   */
  async delPattern(pattern) {
    try {
      await this.initialize();
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  async exists(key) {
    try {
      await this.initialize();
      return await this.redis.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set expiry on key
   * @param {string} key - Cache key
   * @param {number} seconds - Seconds until expiry
   */
  async expire(key, seconds) {
    try {
      await this.initialize();
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys
   * @param {string[]} keys - Array of cache keys
   */
  async mget(keys) {
    try {
      await this.initialize();
      const values = await this.redis.mGet(keys);
      return values.map(val => val ? JSON.parse(val) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return [];
    }
  }

  /**
   * Set multiple keys
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      await this.initialize();
      const pipeline = this.redis.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Counter key
   * @param {number} amount - Amount to increment by
   */
  async incr(key, amount = 1) {
    try {
      await this.initialize();
      return await this.redis.incrBy(key, amount);
    } catch (error) {
      console.error('Cache incr error:', error);
      return null;
    }
  }

  /**
   * Decrement counter
   * @param {string} key - Counter key
   * @param {number} amount - Amount to decrement by
   */
  async decr(key, amount = 1) {
    try {
      await this.initialize();
      return await this.redis.decrBy(key, amount);
    } catch (error) {
      console.error('Cache decr error:', error);
      return null;
    }
  }

  /**
   * Add item to set
   * @param {string} key - Set key
   * @param {string|string[]} members - Member(s) to add
   */
  async sadd(key, members) {
    try {
      await this.initialize();
      const membersArray = Array.isArray(members) ? members : [members];
      await this.redis.sAdd(key, membersArray);
      return true;
    } catch (error) {
      console.error('Cache sadd error:', error);
      return false;
    }
  }

  /**
   * Remove item from set
   * @param {string} key - Set key
   * @param {string|string[]} members - Member(s) to remove
   */
  async srem(key, members) {
    try {
      await this.initialize();
      const membersArray = Array.isArray(members) ? members : [members];
      await this.redis.sRem(key, membersArray);
      return true;
    } catch (error) {
      console.error('Cache srem error:', error);
      return false;
    }
  }

  /**
   * Get all members of set
   * @param {string} key - Set key
   */
  async smembers(key) {
    try {
      await this.initialize();
      return await this.redis.sMembers(key);
    } catch (error) {
      console.error('Cache smembers error:', error);
      return [];
    }
  }

  /**
   * Check if member is in set
   * @param {string} key - Set key
   * @param {string} member - Member to check
   */
  async sismember(key, member) {
    try {
      await this.initialize();
      return await this.redis.sIsMember(key, member);
    } catch (error) {
      console.error('Cache sismember error:', error);
      return false;
    }
  }

  /**
   * Add item to sorted set
   * @param {string} key - Sorted set key
   * @param {number} score - Score
   * @param {string} member - Member
   */
  async zadd(key, score, member) {
    try {
      await this.initialize();
      await this.redis.zAdd(key, { score, value: member });
      return true;
    } catch (error) {
      console.error('Cache zadd error:', error);
      return false;
    }
  }

  /**
   * Get range from sorted set
   * @param {string} key - Sorted set key
   * @param {number} start - Start index
   * @param {number} stop - Stop index
   */
  async zrange(key, start, stop) {
    try {
      await this.initialize();
      return await this.redis.zRange(key, start, stop);
    } catch (error) {
      console.error('Cache zrange error:', error);
      return [];
    }
  }

  /**
   * Cache wrapper for functions
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttl - Time to live in seconds
   */
  async wrap(key, fn, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function
      const result = await fn();
      
      // Cache result
      await this.set(key, result, ttl);
      
      return result;
    } catch (error) {
      console.error('Cache wrap error:', error);
      // If cache fails, still return function result
      return await fn();
    }
  }

  /**
   * Clear all cache
   * WARNING: Use with caution in production
   */
  async flushAll() {
    try {
      await this.initialize();
      await this.redis.flushAll();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new CacheService();

/**
 * Common cache key patterns:
 * 
 * User: user:{userId}
 * Vehicle: vehicle:{vehicleId}
 * Vehicle List: vehicles:list:{page}:{filters}
 * Part: part:{partId}
 * Part List: parts:list:{page}:{filters}
 * Swap: swap:{swapId}
 * User Swaps: user:{userId}:swaps
 * User Favorites: user:{userId}:favorites
 * User Notifications: user:{userId}:notifications
 * Search Results: search:{query}:{filters}
 * Stats: stats:{type}:{period}
 * Session: session:{sessionId}
 * Rate Limit: ratelimit:{ip}:{endpoint}
 */
