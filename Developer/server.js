const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.static('public'));

// CORS Configuration for cross-domain
const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://api-nq5k.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'https://api.webburnstech.dev/' // REPLACE WITH YOUR ACTUAL HTDOCS DOMAIN
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Session configuration for cross-domain
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/webburns-tech',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webburns-tech')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    githubId: { type: String },
    avatar: { type: String },
    plan: { type: String, default: 'free' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// API Key Schema
const apiKeySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    scopes: [{ type: String }],
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    lastUsed: { type: Date }
});

// API Usage Schema
const apiUsageSchema = new mongoose.Schema({
    apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'APIKey', required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    responseTime: { type: Number },
    statusCode: { type: Number }
});

const User = mongoose.model('User', userSchema);
const APIKey = mongoose.model('APIKey', apiKeySchema);
const APIUsage = mongoose.model('APIUsage', apiUsageSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';

// Passport Serialization
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy - UPDATED WITH BETTER ERROR HANDLING
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://api-nq5k.onrender.com/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth profile received:', {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
        });

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            console.log('Existing Google user found:', user.email);
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            console.log('Linking Google to existing user:', profile.emails[0].value);
            user.googleId = profile.id;
            user.avatar = profile.photos[0].value;
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        console.log('Creating new user from Google:', profile.emails[0].value);
        user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            avatar: profile.photos[0].value,
            lastLogin: new Date()
        });
        
        await user.save();
        console.log('New Google user created successfully');
        done(null, user);
    } catch (error) {
        console.error('Google OAuth error details:', error);
        done(error, null);
    }
}));

// GitHub OAuth Strategy - UPDATED WITH BETTER ERROR HANDLING
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "https://api-nq5k.onrender.com/api/auth/github/callback",
    scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('GitHub OAuth profile received:', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails
        });

        // Check if user already exists with this GitHub ID
        let user = await User.findOne({ githubId: profile.id });
        
        if (user) {
            console.log('Existing GitHub user found:', user.email);
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
        }
        
        // Get email from GitHub profile
        let email = null;
        if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value;
        } else {
            // If no public email, create a placeholder
            email = `${profile.username}@users.noreply.github.com`;
            console.log('No email found in GitHub profile, using placeholder:', email);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email });
        
        if (user) {
            console.log('Linking GitHub to existing user:', email);
            user.githubId = profile.id;
            user.avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatar;
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        console.log('Creating new user from GitHub:', email);
        user = new User({
            name: profile.displayName || profile.username,
            email: email,
            githubId: profile.id,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            lastLogin: new Date()
        });
        
        await user.save();
        console.log('New GitHub user created successfully');
        done(null, user);
    } catch (error) {
        console.error('GitHub OAuth error details:', error);
        done(error, null);
    }
}));

// Generate secure API key
function generateAPIKey(prefix = 'wb_sk') {
    const crypto = require('crypto');
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(24).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// API key validation middleware
const validateAPIKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        const keyDoc = await APIKey.findOne({ 
            key: apiKey, 
            status: 'active',
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null }
            ]
        }).populate('userId');

        if (!keyDoc) {
            return res.status(403).json({ error: 'Invalid or expired API key' });
        }

        req.apiKey = keyDoc;
        
        // Update last used
        keyDoc.lastUsed = new Date();
        await keyDoc.save();
        
        // Log API usage
        const startTime = Date.now();
        res.on('finish', async () => {
            try {
                const responseTime = Date.now() - startTime;
                const usage = new APIUsage({
                    apiKeyId: keyDoc._id,
                    endpoint: req.path,
                    method: req.method,
                    timestamp: new Date(),
                    responseTime: responseTime,
                    statusCode: res.statusCode
                });
                await usage.save();
            } catch (error) {
                console.error('Error logging API usage:', error);
            }
        });

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Database connection check middleware
const checkDBConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error('Database not connected. Ready state:', mongoose.connection.readyState);
        return res.status(500).json({ error: 'Database connection unavailable' });
    }
    next();
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Webburns Tech API',
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Debug middleware for OAuth
app.use('/api/auth/github/callback', (req, res, next) => {
    console.log('GitHub Callback - Query params:', req.query);
    console.log('GitHub Callback - Headers:', req.headers);
    next();
});

app.use('/api/auth/google/callback', (req, res, next) => {
    console.log('Google Callback - Query params:', req.query);
    console.log('Google Callback - Headers:', req.headers);
    next();
});

// OAuth Routes

// Google OAuth
app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

app.get('/api/auth/google/callback', 
    checkDBConnection,
    passport.authenticate('google', { 
        failureRedirect: (process.env.CLIENT_URL || 'https://api.webburnstech.dev/') + '/api-key.html?error=auth_failed'
    }),
    async (req, res) => {
        try {
            console.log('Google OAuth callback successful for user:', req.user.email);
            
            // Generate JWT token
            const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '24h' });
            
            // Redirect to client with token as URL parameter
            const redirectUrl = `${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}/api-key.html?token=${token}`;
            console.log('Redirecting to:', redirectUrl);
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Google OAuth callback error details:', error);
            res.redirect(`${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}/api-key.html?error=token_generation_failed`);
        }
    }
);

// GitHub OAuth
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback', 
    checkDBConnection,
    passport.authenticate('github', { 
        failureRedirect: (process.env.CLIENT_URL || 'https://api.webburnstech.dev/') + '/api-key.html?error=auth_failed'
    }),
    async (req, res) => {
        try {
            console.log('GitHub OAuth callback successful for user:', req.user.email);
            
            // Generate JWT token
            const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '24h' });
            
            // Redirect to client with token as URL parameter
            const redirectUrl = `${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}/api-key.html?token=${token}`;
            console.log('Redirecting to:', redirectUrl);
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('GitHub OAuth callback error details:', error);
            res.redirect(`${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}/api-key.html?error=token_generation_failed`);
        }
    }
);

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            lastLogin: new Date()
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                plan: user.plan,
                avatar: user.avatar 
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check if user has password (might be OAuth-only user)
        if (!user.password) {
            return res.status(400).json({ 
                error: 'This account uses social login. Please sign in with Google or GitHub.' 
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                plan: user.plan,
                avatar: user.avatar 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                plan: user.plan,
                avatar: user.avatar 
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate API key
app.post('/api/keys/generate', authenticateToken, async (req, res) => {
    try {
        const { name, expiresInDays, scopes } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!name) {
            return res.status(400).json({ error: 'Key name is required' });
        }

        // Check user's plan limits
        const user = await User.findById(userId);
        const existingKeys = await APIKey.countDocuments({ userId, status: 'active' });

        if (user.plan === 'free' && existingKeys >= 1) {
            return res.status(400).json({ error: 'Free plan limited to 1 active API key' });
        }

        if (user.plan === 'pro' && existingKeys >= 3) {
            return res.status(400).json({ error: 'Pro plan limited to 3 active API keys' });
        }

        // Calculate expiry date based on plan
        let expiresAt = null;
        if (expiresInDays > 0) {
            expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        }

        // Generate API key
        const apiKey = generateAPIKey();

        // Create API key document
        const keyDoc = new APIKey({
            userId,
            name,
            key: apiKey,
            scopes: scopes || ['database', 'ai', 'server'],
            expiresAt
        });

        await keyDoc.save();

        res.status(201).json({
            message: 'API key generated successfully',
            key: apiKey,
            keyInfo: {
                id: keyDoc._id,
                name: keyDoc.name,
                scopes: keyDoc.scopes,
                createdAt: keyDoc.createdAt,
                expiresAt: keyDoc.expiresAt
            }
        });
    } catch (error) {
        console.error('Generate key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's API keys
app.get('/api/keys', authenticateToken, async (req, res) => {
    try {
        const keys = await APIKey.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json({ keys });
    } catch (error) {
        console.error('Get keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Revoke API key
app.patch('/api/keys/:keyId/revoke', authenticateToken, async (req, res) => {
    try {
        const key = await APIKey.findOne({ 
            _id: req.params.keyId, 
            userId: req.user.userId 
        });

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        key.status = 'revoked';
        key.revokedAt = new Date();
        await key.save();

        res.json({ message: 'API key revoked successfully' });
    } catch (error) {
        console.error('Revoke key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API Usage statistics
app.get('/api/usage', authenticateToken, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Get usage data with more detailed information
        const usage = await APIUsage.aggregate([
            {
                $lookup: {
                    from: 'apikeys',
                    localField: 'apiKeyId',
                    foreignField: '_id',
                    as: 'apiKey'
                }
            },
            { 
                $match: { 
                    'apiKey.userId': new mongoose.Types.ObjectId(req.user.userId),
                    timestamp: { $gte: thirtyDaysAgo } 
                } 
            },
            {
                $group: {
                    _id: { 
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
                    },
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: "$responseTime" },
                    successCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $gte: ["$statusCode", 200] },
                                    { $lt: ["$statusCode", 300] }
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { 
                $sort: { '_id.date': 1 } 
            }
        ]);

        // Get recent API calls for the table
        const recentCalls = await APIUsage.aggregate([
            {
                $lookup: {
                    from: 'apikeys',
                    localField: 'apiKeyId',
                    foreignField: '_id',
                    as: 'apiKey'
                }
            },
            { 
                $match: { 
                    'apiKey.userId': new mongoose.Types.ObjectId(req.user.userId)
                } 
            },
            { $sort: { timestamp: -1 } },
            { $limit: 10 },
            {
                $project: {
                    endpoint: 1,
                    method: 1,
                    statusCode: 1,
                    responseTime: 1,
                    timestamp: 1
                }
            }
        ]);

        res.json({ 
            usage,
            recentCalls 
        });
    } catch (error) {
        console.error('Usage stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Demo API endpoints (protected by API key)

// Database API demo endpoint
app.get('/api/v1/database/records', validateAPIKey, (req, res) => {
    // Check if API key has database scope
    if (!req.apiKey.scopes.includes('database')) {
        return res.status(403).json({ error: 'Insufficient scope permissions' });
    }

    // Simulate database query delay
    setTimeout(() => {
        res.json({
            message: 'Database API demo endpoint',
            data: [
                { id: 1, name: 'Sample Record 1', value: 100 },
                { id: 2, name: 'Sample Record 2', value: 200 }
            ]
        });
    }, 100);
});

// AI API demo endpoint
app.post('/api/v1/ai/analyze', validateAPIKey, (req, res) => {
    if (!req.apiKey.scopes.includes('ai')) {
        return res.status(403).json({ error: 'Insufficient scope permissions' });
    }

    const { text, analysis_type } = req.body;

    // Simulate AI processing delay
    setTimeout(() => {
        res.json({
            message: 'AI analysis completed',
            analysis_type,
            result: {
                sentiment: 'positive',
                confidence: 0.87,
                keywords: ['sample', 'analysis', 'text']
            }
        });
    }, 300);
});

// Server API demo endpoint
app.post('/api/v1/server/deploy', validateAPIKey, (req, res) => {
    if (!req.apiKey.scopes.includes('server')) {
        return res.status(403).json({ error: 'Insufficient scope permissions' });
    }

    const { app_name, repository } = req.body;

    // Simulate deployment processing
    setTimeout(() => {
        res.json({
            message: 'Deployment initiated',
            deployment_id: 'dep_' + Date.now(),
            status: 'pending',
            app_name,
            repository
        });
    }, 500);
});

// Serve static files
app.get('/', (req, res) => {
    res.json({ 
        message: 'Webburns Tech API Server',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            keys: '/api/keys',
            usage: '/api/usage',
            demo: '/api/v1'
        }
    });
});

// Redirect to frontend
app.get('/api-key.html', (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'https://api.webburnstech.dev/' + '/api-key.html');
});

// Specific error handler for OAuth routes
app.use('/api/auth/*', (error, req, res, next) => {
    console.error('OAuth Route Error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}/api-key.html?error=oauth_failed`);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: https://api-nq5k.onrender.com:${PORT}/api/health`);
    console.log(`🔐 OAuth URLs:`);
    console.log(`   - Google: https://api-nq5k.onrender.com:${PORT}/api/auth/google`);
    console.log(`   - GitHub: https://api-nq5k.onrender.com:${PORT}/api/auth/github`);
    console.log(`🎯 Frontend: ${process.env.CLIENT_URL || 'https://api.webburnstech.dev/'}`);
    console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
});
