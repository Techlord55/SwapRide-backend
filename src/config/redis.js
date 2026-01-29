/**
 * Redis Configuration
 * Used for caching, sessions, rate limiting, and real-time features
 * OPTIONAL - Application works without Redis
 */

const { createClient } = require('redis');

let redisClient = null;
let redisEnabled = false;

const connectRedis = async () => {
  // Check if Redis should be enabled
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  
  if (!redisUrl && !redisHost) {
    console.log('ℹ️  Redis not configured - caching disabled');
    console.log('   To enable Redis, set REDIS_URL in .env');
    return null;
  }

  try {
    // Create Redis client with proper configuration
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: false // Disable auto-reconnect
      }
    };

    // Add password if provided
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    // Add URL if provided (overrides host/port)
    if (process.env.REDIS_URL) {
      redisClient = createClient({ 
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: false
        }
      });
    } else {
      redisClient = createClient(redisConfig);
    }

    // Event handlers
    redisClient.on('error', (err) => {
      console.error('❌ Redis Error:', err.message);
      redisEnabled = false;
    });

    redisClient.on('connect', () => {
      console.log('🔌 Connecting to Redis...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected successfully');
      redisEnabled = true;
    });

    redisClient.on('end', () => {
      console.log('⚠️  Redis disconnected');
      redisEnabled = false;
    });

    // Connect to Redis with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);

    redisEnabled = true;
    return redisClient;

  } catch (error) {
    console.warn('⚠️  Could not connect to Redis:', error.message);
    console.log('ℹ️  Application will continue without Redis (caching disabled)');
    redisEnabled = false;
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  if (!redisEnabled || !redisClient || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return redisEnabled && redisClient && redisClient.isOpen;
};

// ==================== Cache Operations ====================

const cacheGet = async (key) => {
  try {
    if (!isRedisConnected()) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

const cacheSet = async (key, value, expireSeconds = 3600) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.setEx(key, expireSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    return false;
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    if (!isRedisConnected()) return 0;
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;
    await redisClient.del(keys);
    return keys.length;
  } catch (error) {
    return 0;
  }
};

const cacheExists = async (key) => {
  try {
    if (!isRedisConnected()) return false;
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    return false;
  }
};

const cacheExpire = async (key, seconds) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.expire(key, seconds);
    return true;
  } catch (error) {
    return false;
  }
};

const cacheIncr = async (key, increment = 1) => {
  try {
    if (!isRedisConnected()) return null;
    const value = await redisClient.incrBy(key, increment);
    return value;
  } catch (error) {
    return null;
  }
};

// ==================== List Operations ====================

const listPush = async (key, value) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.rPush(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

const listRange = async (key, start = 0, end = -1) => {
  try {
    if (!isRedisConnected()) return [];
    const data = await redisClient.lRange(key, start, end);
    return data.map(item => JSON.parse(item));
  } catch (error) {
    return [];
  }
};

// ==================== Set Operations ====================

const setAdd = async (key, member) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.sAdd(key, JSON.stringify(member));
    return true;
  } catch (error) {
    return false;
  }
};

const setMembers = async (key) => {
  try {
    if (!isRedisConnected()) return [];
    const data = await redisClient.sMembers(key);
    return data.map(item => JSON.parse(item));
  } catch (error) {
    return [];
  }
};

const setRemove = async (key, member) => {
  try {
    if (!isRedisConnected()) return false;
    await redisClient.sRem(key, JSON.stringify(member));
    return true;
  } catch (error) {
    return false;
  }
};

// ==================== Disconnect ====================

const disconnectRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('✅ Redis disconnected gracefully');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Redis:', error.message);
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  isRedisConnected,
  
  // Cache operations
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheExists,
  cacheExpire,
  cacheIncr,
  
  // List operations
  listPush,
  listRange,
  
  // Set operations
  setAdd,
  setMembers,
  setRemove
};
