const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Error:', err);
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Ready');
    });

    redisClient.on('reconnecting', () => {
      console.warn('⚠️  Redis Reconnecting...');
    });

    process.on('SIGINT', async () => {
      await redisClient.quit();
      console.log('Redis connection closed due to app termination');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
