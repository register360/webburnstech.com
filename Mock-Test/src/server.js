require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { scheduleCredentialSending } = require('./utils/scheduler');

// Import routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

// Import rate limiters
const rateLimitFactory = require('./middleware/rateLimit');   // ✔ NEW

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 10000;

// ==================== Middleware ====================

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// General rate limiter for all routes
app.use('/api/', rateLimitFactory);

// ==================== Routes ====================

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WebburnsTech Mock Test API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ==================== Server Initialization ====================

const startServer = async () => {
  try {
    console.log('🚀 Starting WebburnsTech Mock Test Backend...\n');
    
    // Connect to MongoDB
    await connectDB();
    
  
    // Connect to Redis FIRST
const redisClient = connectRedis();

// Create rate-limiters AFTER Redis is initialized
const {
  generalLimiter,
  registrationLimiter,
  otpLimiter,
  loginLimiter,
  answerSaveLimiter,
  contactLimiter
} = rateLimitFactory(redisClient);

// Apply general limiter
app.use('/api/', generalLimiter);

// Now apply specific limiters inside routes

    // Initialize scheduler for credential sending
    scheduleCredentialSending();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log('\n✅ Server is running!');
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Server Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
      console.log('\n📋 Available Routes:');
      console.log('  - GET  /health');
      console.log('  - POST /api/auth/register');
      console.log('  - POST /api/auth/verify-otp');
      console.log('  - POST /api/auth/resend-otp');
      console.log('  - POST /api/auth/login');
      console.log('  - POST /api/auth/logout');
      console.log('  - GET  /api/exam/questions');
      console.log('  - POST /api/exam/attempts/start');
      console.log('  - GET  /api/exam/attempts/:id');
      console.log('  - POST /api/exam/attempts/:id/save');
      console.log('  - POST /api/exam/attempts/:id/cheating-event');
      console.log('  - POST /api/exam/attempts/:id/submit');
      console.log('  - POST /api/admin/login');
      console.log('  - GET  /api/admin/applications');
      console.log('  - GET  /api/admin/applications/:id');
      console.log('  - POST /api/admin/applications/:id/accept');
      console.log('  - POST /api/admin/applications/:id/reject');
      console.log('  - GET  /api/admin/attempts');
      console.log('  - GET  /api/admin/attempts/:id');
      console.log('  - GET  /api/admin/stats');
      console.log('  - POST /api/contact');
      console.log('\n🎯 Ready to accept connections!\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
