const rateLimit = require('express-rate-limit');
const RedisStore = require("@rate-limiter/redis");

// Factories to create rate limiters - will be initialized after Redis connects
let redisClient = null;

// Initialize Redis client reference after connection
const initializeRateLimiters = (client) => {
  redisClient = client;
  
  const store = createRedisStore();
  
  generalLimiter.store = store;
  otpLimiter.store = store;
  loginLimiter.store = store;
  registrationLimiter.store = store;
  answerSaveLimiter.store = store;
  contactLimiter.store = store;
};

// Create Redis store for rate limiting
const createRedisStore = () => {
  if (!redisClient) {
    console.warn('⚠️  Redis not available for rate limiting, using memory store');
    return undefined; // express-rate-limit will use memory store
  }
  
  return new RedisStore({
    // @ts-expect-error - Known issue with rate-limit-redis types
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: 'rl:',
  });
};

// Registration rate limiter - 5 requests per 15 minutes
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined, // Will be set dynamically
});

// OTP verification rate limiter - 3 requests per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many OTP attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined,
});

// Login rate limiter - 5 requests per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined,
});

// Answer save rate limiter - 100 requests per 2 hours
const answerSaveLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours
  max: 100,
  message: {
    success: false,
    error: 'Too many save requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: undefined,
});

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined,
});

// Contact form rate limiter - 3 requests per hour
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many contact form submissions. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined,
});

module.exports = {
  initializeRateLimiters,
  registrationLimiter,
  otpLimiter,
  loginLimiter,
  answerSaveLimiter,
  generalLimiter,
  contactLimiter,
};
