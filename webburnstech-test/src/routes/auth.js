const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient, logger } = require('../../server');
const { sendOTPEmail, sendVerificationPendingEmail } = require('../services/emailService');
const { validateRegistration, validateOTP } = require('../middleware/validation');

const router = express.Router();

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test route to check if auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// Registration endpoint
router.post('/register', validateRegistration, async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const {
      firstName,
      lastName,
      fatherName,
      motherName,
      dob,
      gender,
      email,
      phone,
      city,
      state
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Create user
    const user = new User({
      firstName,
      lastName,
      fatherName,
      motherName,
      dob: new Date(dob),
      gender,
      email,
      phone,
      city,
      state,
      otp: {
        code: otpCode,
        expiresAt: otpExpires
      }
    });

    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, firstName, otpCode);
    } catch (emailError) {
      console.log('Email sending failed, but user registered:', emailError);
      // Continue even if email fails for testing
    }

    // Store OTP in Redis for rate limiting
    await redisClient.setEx(`otp_attempts:${user._id}`, 900, '0');

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      userId: user._id,
      message: 'Registration successful. OTP sent to your email.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', validateOTP, async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check OTP attempts
    const attemptsKey = `otp_attempts:${userId}`;
    const attempts = parseInt(await redisClient.get(attemptsKey) || '0');
    
    if (attempts >= 5) {
      return res.status(429).json({ 
        error: 'Too many OTP attempts. Please try again later.' 
      });
    }

    // Verify OTP
    if (!user.otp || user.otp.code !== otp) {
      await redisClient.incr(attemptsKey);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (user.otp.expiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Update user status
    user.status = 'verified';
    user.verifiedAt = new Date();
    user.otp = undefined;
    await user.save();

    // Send verification pending email
    try {
      await sendVerificationPendingEmail(user.email, user.firstName);
    } catch (emailError) {
      console.log('Verification email failed:', emailError);
    }

    // Clear OTP attempts
    await redisClient.del(attemptsKey);

    logger.info(`User verified: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verified successfully. Your application is under review.'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    logger.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check exam time (30-11-2025 16:00–18:00 IST)
    const examStart = new Date('2025-11-30T10:30:00Z');
    const examEnd = new Date('2025-11-30T12:30:00Z');
    const now = new Date();

    if (now < examStart || now > examEnd) {
      return res.status(403).json({ 
        error: 'Login only allowed during exam hours (16:00–18:00 IST on 30-11-2025)' 
      });
    }

    const user = await User.findOne({ email, status: 'accepted' });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials or application not accepted' 
      });
    }

    // Verify credentials
    if (!user.examCredentials || user.examCredentials.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

    // Store session in Redis
    const sessionKey = `session:${user._id}`;
    await redisClient.setEx(sessionKey, 10800, token);

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
