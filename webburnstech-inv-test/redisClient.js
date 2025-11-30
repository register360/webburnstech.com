// redisClient.js
const memoryStore = require('./memoryStore');

let client = memoryStore; // Default to memory store
let usingRedis = false;

// Only try to use real Redis if REDIS_URL is provided and valid
if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis://')) {
  try {
    const redis = require('redis');
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error, falling back to memory store:', err.message);
      client = memoryStore;
      usingRedis = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
      client = redisClient;
      usingRedis = true;
    });

    // Try to connect, but fall back to memory store if it fails
    redisClient.connect().catch(err => {
      console.error('Failed to connect to Redis, using memory store:', err.message);
      client = memoryStore;
      usingRedis = false;
    });

  } catch (error) {
    console.error('Redis package not available, using memory store:', error.message);
    client = memoryStore;
    usingRedis = false;
  }
} else {
  console.log('No REDIS_URL provided, using memory store');
}

module.exports = {
  redisClient: client,
  isRedisConnected: () => usingRedis,
  getStorageType: () => usingRedis ? 'redis' : 'memory'
};
