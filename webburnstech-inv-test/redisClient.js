// redisClient.js
const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;
