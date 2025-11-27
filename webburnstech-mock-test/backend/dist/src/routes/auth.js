"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const server_1 = require("../../server");
const emailService_1 = require("../services/emailService");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// Registration endpoint
router.post('/register', validation_1.validateRegistration, async (req, res) => {
    try {
        const { firstName, lastName, fatherName, motherName, dob, gender, email, phone, city, state } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }
        // Generate OTP
        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        // Create user
        const user = new User_1.default({
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
        await (0, emailService_1.sendOTPEmail)(email, firstName, otpCode);
        // Store OTP in Redis for rate limiting
        await server_1.redisClient.setEx(`otp_attempts:${user._id}`, 900, '0'); // 15 minutes
        server_1.logger.info(`User registered: ${email}`);
        res.status(201).json({
            success: true,
            userId: user._id,
            message: 'Registration successful. OTP sent to your email.'
        });
    }
    catch (error) {
        server_1.logger.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify OTP endpoint
router.post('/verify-otp', validation_1.validateOTP, async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check OTP attempts
        const attemptsKey = `otp_attempts:${userId}`;
        const attempts = parseInt(await server_1.redisClient.get(attemptsKey) || '0');
        if (attempts >= 5) {
            return res.status(429).json({
                error: 'Too many OTP attempts. Please try again later.'
            });
        }
        // Verify OTP
        if (!user.otp || user.otp.code !== otp) {
            await server_1.redisClient.incr(attemptsKey);
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
        await (0, emailService_1.sendVerificationPendingEmail)(user.email, user.firstName);
        // Clear OTP attempts
        await server_1.redisClient.del(attemptsKey);
        server_1.logger.info(`User verified: ${user.email}`);
        res.json({
            success: true,
            message: 'Email verified successfully. Your application is under review.'
        });
    }
    catch (error) {
        server_1.logger.error('OTP verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check exam time (30-11-2025 16:00–18:00 IST)
        const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST in UTC
        const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST in UTC
        const now = new Date();
        if (now < examStart || now > examEnd) {
            return res.status(403).json({
                error: 'Login only allowed during exam hours (16:00–18:00 IST on 30-11-2025)'
            });
        }
        const user = await User_1.default.findOne({ email, status: 'accepted' });
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
        const token = jsonwebtoken_1.default.sign({
            userId: user._id,
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: '3h' });
        // Store session in Redis
        const sessionKey = `session:${user._id}`;
        await server_1.redisClient.setEx(sessionKey, 10800, token); // 3 hours
        server_1.logger.info(`User logged in: ${email}`);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                email: user.email
            }
        });
    }
    catch (error) {
        server_1.logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
