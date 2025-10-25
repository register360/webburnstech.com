const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// JWT Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists in Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(decoded.uid)
            .get();

        if (!userDoc.exists) {
            return res.status(401).json({
                success: false,
                error: 'User not found. Token invalid.'
            });
        }

        // Add user to request object
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            username: decoded.username,
            name: userDoc.data().name
        };

        next();

    } catch (error) {
        console.error('Authentication error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(decoded.uid)
                .get();

            if (userDoc.exists) {
                req.user = {
                    uid: decoded.uid,
                    email: decoded.email,
                    username: decoded.username,
                    name: userDoc.data().name
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication for optional routes
        next();
    }
};

// Admin authorization middleware
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if user is admin (you might want to store this in user document)
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(req.user.uid)
            .get();

        const userData = userDoc.data();

        if (!userData.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authorization failed'
        });
    }
};

// Check if user owns the resource
const requireOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            let resourceId;
            let resource;

            switch (resourceType) {
                case 'post':
                    resourceId = req.params.postId;
                    const postDoc = await admin.firestore()
                        .collection('posts')
                        .doc(resourceId)
                        .get();
                    resource = postDoc.data();
                    break;

                case 'user':
                    resourceId = req.params.uid;
                    if (resourceId !== req.user.uid) {
                        return res.status(403).json({
                            success: false,
                            error: 'Not authorized to access this resource'
                        });
                    }
                    return next();

                case 'notification':
                    resourceId = req.params.notificationId;
                    const notificationDoc = await admin.firestore()
                        .collection('notifications')
                        .doc(resourceId)
                        .get();
                    resource = notificationDoc.data();
                    break;

                default:
                    return res.status(500).json({
                        success: false,
                        error: 'Invalid resource type'
                    });
            }

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    error: 'Resource not found'
                });
            }

            // Check ownership
            if (resource.userId !== req.user.uid && !req.user.isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to access this resource'
                });
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({
                success: false,
                error: 'Authorization failed'
            });
        }
    };
};

// Rate limiting helper (you might want to use express-rate-limit package)
const createRateLimiter = (windowMs, maxRequests) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        for (const [key, timestamp] of requests.entries()) {
            if (timestamp < windowStart) {
                requests.delete(key);
            }
        }

        // Check current requests
        const userRequests = Array.from(requests.values())
            .filter(timestamp => timestamp > windowStart)
            .length;

        if (userRequests >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.'
            });
        }

        // Record this request
        requests.set(ip, now);

        next();
    };
};

module.exports = {
    authenticate,
    optionalAuthenticate,
    requireAdmin,
    requireOwnership,
    createRateLimiter
};
