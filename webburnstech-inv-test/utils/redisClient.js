const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
});

(async () => {
    try {
        await redisClient.connect();
        console.log("✅ Redis connected successfully");
    } catch (err) {
        console.error("❌ Failed to connect Redis:", err);
    }
})();

module.exports = { redisClient };
