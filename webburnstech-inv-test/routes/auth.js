// routes/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');

// FIXED: absolute, guaranteed correct import
const { redisClient } = require(path.join(__dirname, '..', 'server.js'));

const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const AuditLog = require('../models/AuditLog');

const Joi = require('joi');
const router = express.Router();

/* -------------------------------
   VALIDATION SCHEMAS
--------------------------------*/
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

/* -------------------------------
   REGISTER
--------------------------------*/
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }

    const user = new User(value);
    const otp = user.generateOTP();
    await user.save();

    const emailSent = await sendEmail({
      to: user.email,
      subject: 'WebburnsTech Mock Test - Verify your email',
      html: `
        <h2>WebburnsTech Mock Test - Email Verification</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 15 minutes.</p>
      `
    });

    if (!emailSent) {
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'REGISTER',
      details: { email: user.email }
    });

    res.json({ success: true, userId: user._id });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/* -------------------------------
   VERIFY OTP
--------------------------------*/
router.post('/verify-otp', async (req, res) => {
  try {
    const { error, value } = otpSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const user = await User.findById(value.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'OTP already verified' });
    }

    if (!user.verifyOTP(value.otp)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    user.status = 'verified';
    user.verifiedAt = new Date();
    user.otp = undefined;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'WebburnsTech — Application received',
      html: `
        <h2>Application Received</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your application is under review. Exam credentials will be sent 2 hours before the exam.</p>
      `
    });

    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'OTP_VERIFIED'
    });

    res.json({ success: true, message: 'Email verified successfully' });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
});

/* -------------------------------
   MAIN EXAM LOGIN
--------------------------------*/
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (user.status !== 'accepted') {
      return res.status(401).json({ success: false, error: 'Your application is not yet accepted' });
    }

    if (user.examPassword !== value.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Time-restricted login
    const now = new Date();
    const examStart = new Date('2025-11-30T10:30:00Z');
    const examEnd = new Date('2025-11-30T12:30:00Z');

    if (now < examStart || now > examEnd) {
      return res.status(403).json({
        success: false,
        error: 'Exam login is only allowed 16:00–18:00 IST'
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    const sessionKey = `session:${user._id}`;
    await redisClient.setEx(sessionKey, 3 * 60 * 60, token);

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

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/* -------------------------------
   DEMO LOGIN (NO TIME LIMIT)
--------------------------------*/
router.post('/demo-login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (user.status !== 'accepted') {
      return res.status(401).json({ success: false, error: 'Your application is not yet accepted' });
    }

    if (user.examPassword !== value.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, isDemo: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const sessionKey = `demo-session:${user._id}`;
    await redisClient.setEx(sessionKey, 24 * 60 * 60, token);

    await AuditLog.create({
      userId: user._id,
      ip: req.ip,
      event: 'DEMO_LOGIN'
    });

    res.json({
      success: true,
      token,
      isDemo: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ success: false, error: 'Demo login failed' });
  }
});

/* -------------------------------
   RESEND OTP
--------------------------------*/
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, error: 'User ID is required' });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, error: 'User not found' });

    if (user.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'OTP already verified' });
    }

    const otpKey = `otp_resend:${userId}`;
    const resendCount = await redisClient.get(otpKey);

    if (resendCount && parseInt(resendCount) >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many OTP resend attempts.'
      });
    }

    const otp = user.generateOTP();
    await user.save();

    await redisClient.setEx(otpKey, 3600, (parseInt(resendCount) || 0) + 1);

    const emailSent = await sendEmail({
      to: user.email,
      subject: 'WebburnsTech - New OTP',
      html: `
        <h2>New Verification Code</h2>
        <p>Your new OTP: <strong>${otp}</strong></p>
      `
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP'
      });
    }

    res.json({ success: true, message: 'New OTP sent' });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to resend OTP' });
  }
});

module.exports = router;
