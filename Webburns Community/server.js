const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            connectSrc: ["'self'", "https://webburns-backend.onrender.com", "http://localhost:5000"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'https://webburns-community.netlify.app',
            'https://yourdomain.com',
            'https://www.yourdomain.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('netlify.app') || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// More specific rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    }
});

app.use('/api/auth', authLimiter);

// Body Parsing Middleware
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Serve static files from frontend (if serving frontend from same server)
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Firebase Admin
try {
    const serviceAccount = require('./config/firebase-service-account.json');
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    
    // For development without Firebase, create a mock admin
    if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  Running in development mode without Firebase');
        // You might want to set up a mock admin object here
    } else {
        process.exit(1);
    }
}

// MongoDB Connection (Optional)
if (process.env.USE_MONGODB === 'true' && process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        console.log('⚠️  Continuing without MongoDB...');
    });
} else {
    console.log('ℹ️  MongoDB not configured, running without analytics');
}

// Import Routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const userRoutes = require('./routes/user');
const notificationsRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/upload', uploadRoutes);

// AI Routes (Optional - for Webburns AI features)
app.use('/api/ai', require('./routes/ai'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Webburns Community API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Service Status Endpoint
app.get('/api/status', async (req, res) => {
    const status = {
        success: true,
        server: 'operational',
        database: 'unknown',
        storage: 'unknown',
        timestamp: new Date().toISOString()
    };

    // Check Firebase connection
    try {
        await admin.firestore().collection('users').limit(1).get();
        status.database = 'operational';
    } catch (error) {
        status.database = 'degraded';
        status.database_error = error.message;
    }

    // Check Firebase Storage
    try {
        await admin.storage().bucket().getFiles({ maxResults: 1 });
        status.storage = 'operational';
    } catch (error) {
        status.storage = 'degraded';
        status.storage_error = error.message;
    }

    res.json(status);
});

// Serve frontend for all other routes (if serving frontend from same server)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        // API route not found
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }
    
    // Serve frontend HTML for all other routes (SPA support)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error Handling Middleware
app.use((error, req, res, next) => {
    console.error('🚨 Global Error Handler:', error);

    // Handle CORS errors
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy: Request not allowed'
        });
    }

    // Handle rate limit errors
    if (error.status === 429) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later.'
        });
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid authentication token'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Authentication token expired'
        });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.details
        });
    }

    // Handle Firebase errors
    if (error.code && error.code.startsWith('auth/')) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    // Handle Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 5MB.'
        });
    }

    // Default error response
    res.status(error.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
    });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `API endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Shutting down gracefully...');
    
    try {
        // Close MongoDB connection if connected
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed.');
        }
        
        console.log('👋 Server shut down gracefully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM. Shutting down gracefully...');
    
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed.');
        }
        
        console.log('👋 Server shut down gracefully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // Log to external service in production
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Webburns Community Server Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📅 Started at: ${new Date().toISOString()}
    
📊 Available Endpoints:
   ✅ Health Check: http://localhost:${PORT}/api/health
   ✅ Service Status: http://localhost:${PORT}/api/status
   🔐 Authentication: http://localhost:${PORT}/api/auth
   📝 Posts: http://localhost:${PORT}/api/posts
   👤 Users: http://localhost:${PORT}/api/user
   🔔 Notifications: http://localhost:${PORT}/api/notifications
   📤 Uploads: http://localhost:${PORT}/api/upload
   🤖 AI Features: http://localhost:${PORT}/api/ai
    
🔧 Server is ready to handle requests!
    `);
});

// Export app for testing
module.exports = { app, server };
