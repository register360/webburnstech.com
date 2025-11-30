// redisClient.js
const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis-10611.crce179.ap-south-1-1.ec2.cloud.redislabs.com:10611',
    port: process.env.REDIS_PORT || 10611
  },
  password: process.env.REDIS_PASSWORD || 'UZr9sy5utYZklg5y49CYcai2o0sB5uPi'
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
