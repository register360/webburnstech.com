// src/middleware/rateLimit.js

const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");

// Factory function that accepts redisClient
module.exports = (redisClient) => {
  const createRedisStore = () => {
    return new RedisStore({
      client: redisClient,
      prefix: "rl:",
    });
  };

  return {
    // Registration
    registrationLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        error: "Too many registration attempts. Try again after 15 minutes.",
      },
    }),

    // OTP
    otpLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 15 * 60 * 1000,
      max: 3,
      message: {
        success: false,
        error: "Too many OTP attempts. Try again after 15 minutes.",
      },
    }),

    // Login
    loginLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        error: "Too many login attempts. Try again after 15 minutes.",
      },
    }),

    // Save Answer
    answerSaveLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 2 * 60 * 60 * 1000,
      max: 100,
      skipSuccessfulRequests: true,
      message: {
        success: false,
        error: "Too many save requests. Please slow down.",
      },
    }),

    // General API limit
    generalLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: {
        success: false,
        error: "Too many requests. Please try again later.",
      },
    }),

    // Contact
    contactLimiter: rateLimit({
      store: createRedisStore(),
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: {
        success: false,
        error: "Too many contact form submissions. Try again after 1 hour.",
      },
    }),
  };
};
