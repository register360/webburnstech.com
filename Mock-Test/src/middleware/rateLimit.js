const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

// Create Redis store for rate limiting
const createRedisStore = () => {
  return new RedisStore({
    // @ts-expect-error - Known issue with rate-limit-redis types
    client: getRedisClient(),
    prefix: 'rl:',
  });
};

// Registration rate limiter - 5 requests per 15 minutes
const registrationLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification rate limiter - 3 requests per 15 minutes
const otpLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many OTP attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter - 5 requests per 15 minutes
const loginLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Answer save rate limiter - 100 requests per 2 hours
const answerSaveLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 100,
  message: {
    success: false,
    error: 'Too many save requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form rate limiter - 3 requests per hour
const contactLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many contact form submissions. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  registrationLimiter,
  otpLimiter,
  loginLimiter,
  answerSaveLimiter,
  generalLimiter,
  contactLimiter,
};
