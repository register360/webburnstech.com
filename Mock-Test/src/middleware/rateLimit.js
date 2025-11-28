const rateLimit = require('express-rate-limit');

// Redis client (optional)
let redisClient = null;

// Called after Redis connects — optional (not needed for memory store)
const initializeRateLimiters = (client) => {
  redisClient = client;
  console.log("Rate limiters initialized (memory store used - Redis optional)");
};

// Registration rate limiter - 5 requests per 15 minutes
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification rate limiter
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many OTP attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Answer save limiter
const answerSaveLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many save requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form rate limiter
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many contact submissions. Try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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
