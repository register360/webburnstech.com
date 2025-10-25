const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validateSignup, validateLogin } = require('./middleware/validation');
const { authenticate } = require('./middleware/auth');

const router = express.Router();

// POST /api/auth/signup - Create new user
router.post('/signup', validateSignup, async (req, res) => {
    try {
        const { email, password, firstName, lastName, username } = req.body;

        // Check if user already exists in Firestore
        const usersRef = admin.firestore().collection('users');
        const existingUser = await usersRef.where('email', '==', email).get();
        
        if (!existingUser.empty) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Check username availability
        const existingUsername = await usersRef.where('username', '==', username).get();
        if (!existingUsername.empty) {
            return res.status(400).json({
                success: false,
                error: 'Username already taken'
            });
        }

        let firebaseUser;
        
        // Create user in Firebase Auth
        if (process.env.USE_FIREBASE_AUTH === 'true') {
            firebaseUser = await admin.auth().createUser({
                email,
                password,
                displayName: `${firstName} ${lastName}`,
                disabled: false
            });
        }

        const userId = firebaseUser ? firebaseUser.uid : `local_${Date.now()}`;

        // Create user document in Firestore
        const userData = {
            uid: userId,
            email,
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            username: username.toLowerCase(),
            avatarURL: '',
            bio: '',
            location: '',
            website: '',
            followers: [],
            following: [],
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await usersRef.doc(userId).set(userData);

        // Also store in MongoDB for analytics
        if (process.env.USE_MONGODB === 'true') {
            const UserStats = require('../models/UserStats');
            await UserStats.create({
                userId,
                email,
                postsCount: 0,
                likesCount: 0,
                commentsCount: 0,
                loginCount: 0,
                lastLogin: new Date()
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                uid: userId, 
                email: email,
                username: username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
                uid: userId,
                email,
                name: `${firstName} ${lastName}`,
                username,
                avatarURL: ''
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create user account'
        });
    }
});

// POST /api/auth/login - User login
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password, idToken } = req.body;

        let firebaseUser;
        let userId;

        if (idToken) {
            // Firebase Auth login
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            firebaseUser = await admin.auth().getUser(decodedToken.uid);
            userId = firebaseUser.uid;
        } else {
            // Email/password login (development fallback)
            if (process.env.USE_FIREBASE_AUTH === 'true') {
                // This would normally be handled by Firebase client SDK
                // For backend-only, we'll use a simplified approach
                const usersRef = admin.firestore().collection('users');
                const userSnapshot = await usersRef.where('email', '==', email).get();
                
                if (userSnapshot.empty) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid email or password'
                    });
                }

                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                
                // In a real app, you'd use Firebase Auth for this
                // This is a simplified version for development
                const isValidPassword = await bcrypt.compare(password, userData.passwordHash || '');
                
                if (!isValidPassword) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid email or password'
                    });
                }

                userId = userDoc.id;
            }
        }

        // Get user data from Firestore
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();

        // Update last login in MongoDB
        if (process.env.USE_MONGODB === 'true') {
            const UserStats = require('../models/UserStats');
            await UserStats.findOneAndUpdate(
                { userId },
                { 
                    $inc: { loginCount: 1 },
                    $set: { lastLogin: new Date() }
                },
                { upsert: true }
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                uid: userId, 
                email: userData.email,
                username: userData.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                uid: userId,
                email: userData.email,
                name: userData.name,
                username: userData.username,
                avatarURL: userData.avatarURL,
                bio: userData.bio
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({
                success: false,
                error: 'Token revoked'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const userData = userDoc.data();

        res.json({
            success: true,
            user: {
                uid: req.user.uid,
                email: userData.email,
                name: userData.name,
                username: userData.username,
                avatarURL: userData.avatarURL,
                bio: userData.bio,
                location: userData.location,
                website: userData.website,
                followersCount: userData.followers?.length || 0,
                followingCount: userData.following?.length || 0,
                postsCount: userData.postsCount || 0,
                createdAt: userData.createdAt
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information'
        });
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        // In a real app, you might want to blacklist the token
        // For JWT, since it's stateless, we just return success
        
        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Generate new token
        const newToken = jwt.sign(
            { 
                uid: decoded.uid, 
                email: decoded.email,
                username: decoded.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: newToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
});

module.exports = router;
