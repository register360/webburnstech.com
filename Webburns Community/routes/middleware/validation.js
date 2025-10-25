const { body, param, query, validationResult } = require('express-validator');
const admin = require('firebase-admin');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }
    
    next();
};

// Auth validation rules
const validateSignup = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
        .withMessage('Password must contain at least one letter and one number'),
    
    body('firstName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters')
        .isAlpha('en-US', { ignore: ' -' })
        .withMessage('First name can only contain letters, spaces, and hyphens'),
    
    body('lastName')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters')
        .isAlpha('en-US', { ignore: ' -' })
        .withMessage('Last name can only contain letters, spaces, and hyphens'),
    
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .toLowerCase(),
    
    handleValidationErrors
];

const validateLogin = [
    body('email')
        .if(body('idToken').not().exists())
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .if(body('idToken').not().exists())
        .notEmpty()
        .withMessage('Password is required'),
    
    body('idToken')
        .optional()
        .isString()
        .withMessage('Invalid ID token'),
    
    handleValidationErrors
];

// Post validation rules
const validatePost = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Post content must be between 1 and 1000 characters')
        .escape(),
    
    body('imageURL')
        .optional()
        .isURL()
        .withMessage('Image URL must be a valid URL'),
    
    body('visibility')
        .optional()
        .isIn(['public', 'followers', 'private'])
        .withMessage('Visibility must be one of: public, followers, private'),
    
    handleValidationErrors
];

const validateComment = [
    body('text')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Comment must be between 1 and 500 characters')
        .escape(),
    
    handleValidationErrors
];

// User profile validation
const validateProfileUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters')
        .escape(),
    
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .toLowerCase()
        .custom(async (username, { req }) => {
            // Check if username is already taken by another user
            if (username) {
                const usersRef = admin.firestore().collection('users');
                const snapshot = await usersRef
                    .where('username', '==', username)
                    .where('uid', '!=', req.user.uid)
                    .get();
                
                if (!snapshot.empty) {
                    throw new Error('Username is already taken');
                }
            }
            return true;
        }),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters')
        .escape(),
    
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location must be less than 100 characters')
        .escape(),
    
    body('website')
        .optional()
        .trim()
        .isURL()
        .withMessage('Website must be a valid URL'),
    
    handleValidationErrors
];

// Upload validation
const validateFileUpload = [
    body('fileName')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('File name must be less than 255 characters'),
    
    handleValidationErrors
];

// Query parameter validation
const validatePagination = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    
    query('lastVisible')
        .optional()
        .isString()
        .withMessage('Last visible must be a string'),
    
    handleValidationErrors
];

// ID parameter validation
const validateIdParam = [
    param('id')
        .isString()
        .withMessage('ID must be a string')
        .isLength({ min: 1 })
        .withMessage('ID is required'),
    
    handleValidationErrors
];

// Search validation
const validateSearch = [
    query('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters')
        .escape(),
    
    handleValidationErrors
];

// Custom validators
const customValidators = {
    // Check if user exists
    userExists: async (userId) => {
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();
        return userDoc.exists;
    },

    // Check if post exists
    postExists: async (postId) => {
        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();
        return postDoc.exists;
    },

    // Check if user can view post (based on visibility)
    canViewPost: async (postId, userId) => {
        const postDoc = await admin.firestore()
            .collection('posts')
            .doc(postId)
            .get();
        
        if (!postDoc.exists) return false;

        const post = postDoc.data();
        
        if (post.visibility === 'public') return true;
        if (post.visibility === 'private' && post.userId === userId) return true;
        if (post.visibility === 'followers') {
            // Check if user is following the post owner
            const userDoc = await admin.firestore()
                .collection('users')
                .doc(post.userId)
                .get();
            
            const userData = userDoc.data();
            return userData.followers?.includes(userId) || post.userId === userId;
        }
        
        return false;
    }
};

module.exports = {
    handleValidationErrors,
    validateSignup,
    validateLogin,
    validatePost,
    validateComment,
    validateProfileUpdate,
    validateFileUpload,
    validatePagination,
    validateIdParam,
    validateSearch,
    customValidators
};
