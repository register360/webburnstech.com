const Redis = require("ioredis");

const redisClient = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
});

redisClient.on("connect", () => {
    console.log("Redis connected successfully");
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

module.exports = redisClient;
