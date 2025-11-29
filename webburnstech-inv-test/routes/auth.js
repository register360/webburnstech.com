const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// Input validation schemas
const Joi = require('joi');

// Redis client with fallback
let redisClient;
try {
    redisClient = require('../server.js').redisClient;
} catch (error) {
    console.warn('Redis client not available, using in-memory fallback');
    // In-memory fallback storage
    const memoryStore = new Map();
    redisClient = {
        async setEx(key, seconds, value) {
            memoryStore.set(key, value);
            setTimeout(() => memoryStore.delete(key), seconds * 1000);
            return 'OK';
        },
        async get(key) {
            return memoryStore.get(key) || null;
        },
        async del(key) {
            return memoryStore.delete(key);
        },
        async exists(key) {
            return memoryStore.has(key) ? 1 : 0;
        },
        isOpen: true
    };
}

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  fatherName: Joi.string().trim().min(1).max(50).required(),
  motherName: Joi.string().trim().min(1).max(50).required(),
  dob: Joi.date().max(new Date()).required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  city: Joi.string().trim().min(1).max(50).required(),
  state: Joi.string().trim().min(1).max(50).required()
});

const otpSchema = Joi.object({
  userId: Joi.string().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Helper function to safely use Redis
const safeRedisSetEx = async (key, seconds, value) => {
  try {
    if (redisClient && redisClient.setEx) {
      return await redisClient.setEx(key, seconds, value);
    }
    console.warn('Redis not available, using fallback storage');
    // Fallback to in-memory storage
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), seconds * 1000);
    return 'OK';
  } catch (error) {
    console.warn('Redis setEx failed, using fallback:', error.message);
    // Fallback to in-memory storage
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), seconds * 1000);
    return 'OK';
  }
};

const safeRedisGet = async (key) => {
  try {
    if (redisClient && redisClient.get) {
      return await redisClient.get(key);
    }
    // Fallback to in-memory storage
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    return memoryStore.get(key) || null;
  } catch (error) {
    console.warn('Redis get failed, using fallback:', error.message);
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    return memoryStore.get(key) || null;
  }
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User(value);
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'WebburnsTech Mock Test - Verify your email',
      html: `
        <h2>WebburnsTech Mock Test - Email Verification</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>WebburnsTech Team</p>
      `,
      text: `Your WebburnsTech Mock Test verification code is: ${otp}. This code expires in 15 minutes.`
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email'
      });
    }

    // Log registration
    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'REGISTER',
      details: { email: user.email }
    });

    res.json({
      success: true,
      userId: user._id,
      message: 'Registration successful. OTP sent to your email.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { error, value } = otpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const user = await User.findById(value.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'OTP already verified'
      });
    }

    if (!user.verifyOTP(value.otp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    // Update user status
    user.status = 'verified';
    user.verifiedAt = new Date();
    user.otp = undefined; // Clear OTP after verification
    await user.save();

    // Send verification pending email
    await sendEmail({
      to: user.email,
      subject: 'WebburnsTech — Application received',
      html: `
        <h2>Application Received</h2>
        <p>Hi ${user.firstName},</p>
        <p>We have received your application and are verifying it. If your application is accepted, exam credentials will be sent on the day of the exam (30 Nov 2025), <strong>2 hours before the exam start time (16:00 IST)</strong>.</p>
        <p>If rejected, you will receive a rejection mail.</p>
        <p>Thanks,<br>WebburnsTech Team</p>
      `
    });

    // Log OTP verification
    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'OTP_VERIFIED',
      details: {}
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'OTP verification failed'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is accepted
    if (user.status !== 'accepted') {
      return res.status(401).json({
        success: false,
        error: 'Your application is not yet accepted'
      });
    }

    // Check exam password
    if (user.examPassword !== value.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check exam timing (only allow login during exam window)
    const now = new Date();
    const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST in UTC
    const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST in UTC
    
    if (now < examStart || now > examEnd) {
      return res.status(403).json({
        success: false,
        error: 'Exam login is only available during exam hours (16:00-18:00 IST)'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    // Store session in Redis (with fallback)
    const sessionKey = `session:${user._id}`;
    await safeRedisSetEx(sessionKey, 3 * 60 * 60, token);

    // Log login
    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'LOGIN',
      details: { userAgent: req.get('User-Agent') }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Demo login endpoint (without time restrictions)
router.post('/demo-login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is accepted (but no time restrictions for demo)
    if (user.status !== 'accepted') {
      return res.status(401).json({
        success: false,
        error: 'Your application is not yet accepted'
      });
    }

    // Check exam password
    if (user.examPassword !== value.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token for demo (longer expiry)
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        isDemo: true // Flag to identify demo sessions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Longer expiry for demo
    );

    // Store session in Redis with demo flag (with fallback)
    const sessionKey = `demo-session:${user._id}`;
    await safeRedisSetEx(sessionKey, 24 * 60 * 60, token);

    // Log demo login
    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'DEMO_LOGIN',
      details: { userAgent: req.get('User-Agent') }
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      isDemo: true
    });

  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      success: false,
      error: 'Demo login failed'
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'OTP already verified'
      });
    }

    // Check rate limiting for OTP resend
    const otpKey = `otp_resend:${userId}`;
    const resendCount = await safeRedisGet(otpKey);
    
    if (resendCount && parseInt(resendCount) >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many OTP resend attempts. Please try again later.'
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Update resend count
    await safeRedisSetEx(otpKey, 3600, (parseInt(resendCount) || 0) + 1);

    // Send OTP email
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'WebburnsTech Mock Test - New Verification Code',
      html: `
        <h2>New Verification Code</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your new verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 15 minutes.</p>
        <p>Best regards,<br>WebburnsTech Team</p>
      `
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email'
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent successfully'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
});

module.exports = router;
