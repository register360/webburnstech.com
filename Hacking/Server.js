const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Optional Redis for production
let redisClient = null;
try {
    const redis = require('redis');
    if (process.env.REDIS_URL) {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL
        });
        redisClient.on('error', (err) => {
            console.warn('Redis connection error, falling back to memory storage:', err.message);
            redisClient = null;
        });
        redisClient.connect().then(() => {
            console.log('Connected to Redis');
        });
    }
} catch (err) {
    console.warn('Redis not available, using in-memory storage');
}

const app = express();

// Trust proxy for proper IP detection behind load balancers
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

// Rate limiting middleware
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP' },
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: { error: 'Too many login attempts' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (fallback when Redis is not available)
const memoryStorage = {
    failedAttempts: new Map(), // ip -> count
    blockedIPs: new Map()     // ip -> blockedUntil timestamp
};

// Configuration
const CONFIG = {
    // Demo credentials - replace with real authentication in production
    VALID_USERNAME: process.env.VALID_USERNAME || 'admin',
    VALID_PASSWORD: process.env.VALID_PASSWORD || 'matrix2024',
    
    // Security settings
    MAX_ATTEMPTS_PER_IP: 3,
    BLOCK_DURATION_MS: 3 * 60 * 1000, // 3 minutes
    BLOCK_DURATION_REDIS: 180, // 3 minutes in seconds for Redis TTL
    
    // Cookie settings
    COOKIE_MAX_AGE: 365 * 24 * 60 * 60 * 1000, // 1 year
    DEVICE_PREFIX: 'DEVICE-'
};

// Storage helper functions
class SecurityStorage {
    static async getFailedAttempts(ip) {
        if (redisClient) {
            try {
                const attempts = await redisClient.get(`attempts:${ip}`);
                return attempts ? parseInt(attempts) : 0;
            } catch (err) {
                console.warn('Redis get failed, using memory storage:', err.message);
                return memoryStorage.failedAttempts.get(ip) || 0;
            }
        }
        return memoryStorage.failedAttempts.get(ip) || 0;
    }

    static async setFailedAttempts(ip, count) {
        if (redisClient) {
            try {
                await redisClient.set(`attempts:${ip}`, count.toString());
                return;
            } catch (err) {
                console.warn('Redis set failed, using memory storage:', err.message);
            }
        }
        memoryStorage.failedAttempts.set(ip, count);
    }

    static async incrementFailedAttempts(ip) {
        const current = await this.getFailedAttempts(ip);
        const newCount = current + 1;
        await this.setFailedAttempts(ip, newCount);
        return newCount;
    }

    static async clearFailedAttempts(ip) {
        if (redisClient) {
            try {
                await redisClient.del(`attempts:${ip}`);
                return;
            } catch (err) {
                console.warn('Redis del failed, using memory storage:', err.message);
            }
        }
        memoryStorage.failedAttempts.delete(ip);
    }

    static async getBlockedUntil(ip) {
        if (redisClient) {
            try {
                const blockedUntil = await redisClient.get(`blocked:${ip}`);
                return blockedUntil ? parseInt(blockedUntil) : null;
            } catch (err) {
                console.warn('Redis get blocked failed, using memory storage:', err.message);
                return memoryStorage.blockedIPs.get(ip) || null;
            }
        }
        return memoryStorage.blockedIPs.get(ip) || null;
    }

    static async setBlockedUntil(ip, timestamp) {
        if (redisClient) {
            try {
                await redisClient.setEx(`blocked:${ip}`, CONFIG.BLOCK_DURATION_REDIS, timestamp.toString());
                return;
            } catch (err) {
                console.warn('Redis set blocked failed, using memory storage:', err.message);
            }
        }
        memoryStorage.blockedIPs.set(ip, timestamp);
    }

    static async clearBlock(ip) {
        if (redisClient) {
            try {
                await redisClient.del(`blocked:${ip}`);
                return;
            } catch (err) {
                console.warn('Redis del blocked failed, using memory storage:', err.message);
            }
        }
        memoryStorage.blockedIPs.delete(ip);
    }

    static async getAllBlockedIPs() {
        if (redisClient) {
            try {
                const keys = await redisClient.keys('blocked:*');
                const blocked = [];
                for (const key of keys) {
                    const ip = key.replace('blocked:', '');
                    const blockedUntil = await redisClient.get(key);
                    blocked.push({ ip, blockedUntil: parseInt(blockedUntil) });
                }
                return blocked;
            } catch (err) {
                console.warn('Redis keys failed, using memory storage:', err.message);
            }
        }
        return Array.from(memoryStorage.blockedIPs.entries()).map(([ip, blockedUntil]) => ({
            ip,
            blockedUntil
        }));
    }
}

// Utility functions
function generateDeviceId() {
    return CONFIG.DEVICE_PREFIX + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getClientIP(req) {
    return req.ip || req.connection.remoteAddress || 'unknown';
}

function logSecurityEvent(event, ip, username = null, details = {}) {
    const timestamp = new Date().toISOString();
    const userInfo = username ? `user:${username}` : 'user:unknown';
    console.log(`[SECURITY] ${timestamp} ${event} ip:${ip} ${userInfo}`, details);
}

// Device cookie middleware
app.use((req, res, next) => {
    let deviceName = req.cookies.deviceName;
    
    if (!deviceName) {
        deviceName = generateDeviceId();
        res.cookie('deviceName', deviceName, {
            maxAge: CONFIG.COOKIE_MAX_AGE,
            httpOnly: false, // Allow frontend JavaScript to read it
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    }

    // Set additional device info cookies if provided by client
    if (req.headers['user-agent'] && !req.cookies.deviceUA) {
        res.cookie('deviceUA', req.headers['user-agent'], {
            maxAge: CONFIG.COOKIE_MAX_AGE,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    }

    req.deviceName = deviceName;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'matrix.html'));
});

app.get('/whoami', (req, res) => {
    const clientInfo = {
        ip: getClientIP(req),
        deviceName: req.deviceName,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    };
    res.json(clientInfo);
});

app.post('/login', loginLimiter, async (req, res) => {
    const { username, password, sessionId } = req.body;
    const clientIP = getClientIP(req);
    const deviceName = req.deviceName;

    // Check if IP is blocked
    const blockedUntil = await SecurityStorage.getBlockedUntil(clientIP);
    if (blockedUntil && Date.now() < blockedUntil) {
        logSecurityEvent('BLOCKED_ATTEMPT', clientIP, username, {
            deviceName,
            timeRemaining: blockedUntil - Date.now()
        });

        return res.status(429).json({
            ok: false,
            error: 'Too many attempts',
            blockedUntil: blockedUntil,
            timeRemaining: blockedUntil - Date.now()
        });
    }

    // Validate credentials
    const isValid = username === CONFIG.VALID_USERNAME && password === CONFIG.VALID_PASSWORD;

    if (!isValid) {
        // Increment failed attempts
        const newAttemptCount = await SecurityStorage.incrementFailedAttempts(clientIP);
        const attemptsLeft = CONFIG.MAX_ATTEMPTS_PER_IP - newAttemptCount;

        logSecurityEvent('FAILED_LOGIN', clientIP, username, {
            deviceName,
            attemptCount: newAttemptCount,
            attemptsLeft
        });

        // Check if should block IP
        if (newAttemptCount >= CONFIG.MAX_ATTEMPTS_PER_IP) {
            const blockedUntilTime = Date.now() + CONFIG.BLOCK_DURATION_MS;
            await SecurityStorage.setBlockedUntil(clientIP, blockedUntilTime);

            logSecurityEvent('IP_BLOCKED', clientIP, username, {
                deviceName,
                blockedUntil: blockedUntilTime
            });

            return res.status(429).json({
                ok: false,
                error: 'Too many attempts',
                blockedUntil: blockedUntilTime,
                timeRemaining: CONFIG.BLOCK_DURATION_MS
            });
        }

        return res.status(401).json({
            ok: false,
            error: 'Invalid credentials',
            attemptsLeft: attemptsLeft
        });
    }

    // Successful login
    logSecurityEvent('SUCCESSFUL_LOGIN', clientIP, username, { deviceName });

    // Clear failed attempts and blocks for this IP
    await SecurityStorage.clearFailedAttempts(clientIP);
    await SecurityStorage.clearBlock(clientIP);

    // Set additional security cookie
    res.cookie('loggedIn', 'true', {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    res.json({
        ok: true,
        message: 'Logged in',
        ip: clientIP,
        deviceName: deviceName,
        timestamp: new Date().toISOString()
    });
});

// Admin status endpoint (protected with simple token)
app.get('/status', async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_TOKEN || 'matrix-admin-2024';

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const blockedIPs = await SecurityStorage.getAllBlockedIPs();
        const now = Date.now();

        const status = {
            serverTime: new Date().toISOString(),
            blockedCount: blockedIPs.length,
            blockedIPs: blockedIPs.map(({ ip, blockedUntil }) => ({
                ip,
                blockedUntil: new Date(blockedUntil).toISOString(),
                timeRemaining: Math.max(0, blockedUntil - now),
                isActive: blockedUntil > now
            })),
            config: {
                maxAttempts: CONFIG.MAX_ATTEMPTS_PER_IP,
                blockDurationMs: CONFIG.BLOCK_DURATION_MS,
                storage: redisClient ? 'redis' : 'memory'
            }
        };

        res.json(status);
    } catch (error) {
        console.error('Status endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        storage: redisClient ? 'redis' : 'memory'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Matrix Security Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔐 Demo credentials: ${CONFIG.VALID_USERNAME} / ${CONFIG.VALID_PASSWORD}`);
    console.log(`🗄️  Storage: ${redisClient ? 'Redis' : 'In-Memory'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (redisClient) {
        await redisClient.quit();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    if (redisClient) {
        await redisClient.quit();
    }
    process.exit(0);
});
