const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

app.use(express.json({ limit: '10mb' }));

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/webburnstech', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const User = require('./models/User');
const Question = require('./models/Question');
const Attempt = require('./models/Attempt');
const Contact = require('./models/Contact');
const AuditLog = require('./models/AuditLog');

// Routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Scheduler for sending exam credentials
cron.schedule('0 8 30 11 *', async () => {
  console.log('Running scheduled job: Sending exam credentials');
  await sendExamCredentials();
}, {
  timezone: "Asia/Kolkata"
});

async function sendExamCredentials() {
  try {
    const acceptedUsers = await User.find({ 
      status: 'accepted', 
      credentialsSentAt: null 
    });

    for (const user of acceptedUsers) {
      // Generate random password
      const password = Math.random().toString(36).slice(-8);
      
      // Store password (hashed in real scenario)
      user.examPassword = password;
      user.credentialsSentAt = new Date();
      await user.save();

      // Send email via Resend
      await sendEmail({
        to: user.email,
        subject: 'WebburnsTech — Exam credentials',
        html: `
          <h2>WebburnsTech Mock Test - Exam Credentials</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your application has been ACCEPTED.</p>
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: 30th November 2025</li>
            <li>Time: 16:00 – 18:00 IST</li>
          </ul>
          <p><strong>Your exam credentials:</strong></p>
          <p>Username: ${user.email}</p>
          <p>Password: ${password}</p>
          <p><strong>Important Instructions:</strong></p>
          <ul>
            <li>Login will be available from 14:00 IST</li>
            <li>Exam strictly runs from 16:00–18:00 IST</li>
            <li>Do not switch tabs/windows during exam</li>
            <li>Any suspicious activity may lead to disqualification</li>
          </ul>
          <p>Good luck!</p>
          <p>WebburnsTech Team</p>
        `
      });
    }

    console.log(`Sent credentials to ${acceptedUsers.length} users`);
  } catch (error) {
    console.error('Error sending exam credentials:', error);
  }
}

// Email service using Resend
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'WebburnsTech <learn@webburnstech.dev>',
      to: [to],
      subject: subject,
      html: html,
      text: text
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something went wrong!' 
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, redisClient, sendEmail };
