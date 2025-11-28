const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Audit = require('../models/Audit');
const { generateOTPWithExpiry, validateOTP } = require('../utils/otp');
const { sendOTPEmail, sendVerificationPendingEmail } = require('../utils/email');
const { getRedisClient } = require('../config/redis');
const { getClientIP } = require('../middleware/auth');
const { 
  validate, 
  registrationSchema, 
  otpSchema, 
  loginSchema 
} = require('../middleware/validation');
const {
  registrationLimiter,
  otpLimiter,
  loginLimiter,
} = require('../middleware/rateLimit');

// Check if registration is open
const isRegistrationOpen = () => {
  const now = new Date();
  const start = new Date(process.env.REGISTRATION_START);
  const end = new Date(process.env.REGISTRATION_END);
  
  return now >= start && now <= end;
};

// Check if exam time window is active
const isExamTimeActive = () => {
  const now = new Date();
  const examDate = new Date(process.env.EXAM_DATE);
  const [startHour, startMin] = process.env.EXAM_START_TIME.split(':');
  const [endHour, endMin] = process.env.EXAM_END_TIME.split(':');
  
  const examStart = new Date(examDate);
  examStart.setHours(parseInt(startHour), parseInt(startMin), 0);
  
  const examEnd = new Date(examDate);
  examEnd.setHours(parseInt(endHour), parseInt(endMin), 0);
  
  return now >= examStart && now <= examEnd;
};

// POST /api/auth/register - Register new user
router.post('/register', registrationLimiter, validate(registrationSchema), async (req, res) => {
  try {
    const ip = getClientIP(req);
    
    // Check if registration is open
    if (!isRegistrationOpen()) {
      await Audit.log(null, 'registration_attempted_outside_window', { ip }, ip);
      return res.status(403).json({
        success: false,
        error: 'Registration is currently closed. Please check the registration window dates.',
      });
    }
    
    const { email } = req.validatedData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered. Please use a different email.',
      });
    }
    
    // Generate OTP
    const { code, expiresAt } = generateOTPWithExpiry();
    
    // Create new user
    const user = new User({
      ...req.validatedData,
      status: 'pending',
      otp: { code, expiresAt },
    });
    
    await user.save();
    
    // Send OTP email
    try {
      await sendOTPEmail(email, user.firstName, code);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Don't fail registration if email fails
    }
    
    // Log audit event
    await Audit.log(user._id, 'registration', { email, ip }, ip);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      userId: user._id,
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

// POST /api/auth/verify-otp - Verify OTP
router.post('/verify-otp', otpLimiter, validate(otpSchema), async (req, res) => {
  try {
    const { userId, otp } = req.validatedData;
    const ip = getClientIP(req);
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }
    
    // Validate OTP
    const validation = validateOTP(otp, user.otp?.code, user.otp?.expiresAt);
    
    if (!validation.valid) {
      await Audit.log(user._id, 'otp_verification_failed', { reason: validation.message, ip }, ip);
      return res.status(400).json({
        success: false,
        error: validation.message,
      });
    }
    
    // Update user status
    user.status = 'verified';
    user.verifiedAt = new Date();
    user.otp = undefined; // Clear OTP
    await user.save();
    
    // Send verification pending email
    try {
      await sendVerificationPendingEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }
    
    // Log audit event
    await Audit.log(user._id, 'otp_verified', { email: user.email, ip }, ip);
    
    res.json({
      success: true,
      message: 'Email verified successfully. Your application is now under review.',
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'OTP verification failed. Please try again.',
    });
  }
});

// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', otpLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    const ip = getClientIP(req);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.',
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }
    
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'User is already verified.',
      });
    }
    
    // Generate new OTP
    const { code, expiresAt } = generateOTPWithExpiry();
    user.otp = { code, expiresAt };
    await user.save();
    
    // Send OTP email
    await sendOTPEmail(user.email, user.firstName, code);
    
    // Log audit event
    await Audit.log(user._id, 'otp_resent', { email: user.email, ip }, ip);
    
    res.json({
      success: true,
      message: 'OTP resent successfully.',
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP. Please try again.',
    });
  }
});

// POST /api/auth/login - Login for exam
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedData;
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Check if exam time is active
    if (!isExamTimeActive()) {
      await Audit.log(null, 'login_attempted_outside_window', { email, ip }, ip);
      return res.status(403).json({
        success: false,
        error: 'Login is only available during exam hours (30-11-2025, 16:00-18:00 IST).',
      });
    }
    
    // Find user with password field
    const user = await User.findOne({ email }).select('+examPassword');
    
    if (!user) {
      await Audit.log(null, 'login_failed_user_not_found', { email, ip }, ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }
    
    // Check if user is accepted
    if (user.status !== 'accepted') {
      await Audit.log(user._id, 'login_failed_not_accepted', { email, status: user.status, ip }, ip);
      return res.status(403).json({
        success: false,
        error: 'Your application is not accepted. Please contact support.',
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await Audit.log(user._id, 'login_failed_wrong_password', { email, ip }, ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }
    
    // Check for existing session (single session enforcement)
    const redis = getRedisClient();
    const existingSession = await redis.get(`session:${user._id}`);
    
    if (existingSession) {
      await Audit.log(user._id, 'login_failed_existing_session', { email, ip }, ip);
      return res.status(403).json({
        success: false,
        error: 'You already have an active session. Only one session is allowed.',
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
    );
    
    // Store session in Redis (expires in 3 hours)
    await redis.setex(
      `session:${user._id}`,
      3 * 60 * 60, // 3 hours
      JSON.stringify({
        userId: user._id,
        email: user.email,
        loginTime: new Date(),
        ip,
        userAgent,
      })
    );
    
    // Log successful login
    await Audit.log(user._id, 'login_success', { email, ip, userAgent }, ip);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Remove session from Redis
      const redis = getRedisClient();
      await redis.del(`session:${decoded.userId}`);
      
      await Audit.log(decoded.userId, 'logout', { time: new Date() });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: 'Logged out',
    });
  }
});

module.exports = router;
