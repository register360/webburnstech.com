"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
const Question_1 = __importDefault(require("../models/Question"));
const appGlobals_1 = require("../lib/appGlobals");
const auth_1 = require("../middleware/auth");
const emailService_1 = require("../services/emailService");
const router = express_1.default.Router();
router.get('/applications', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const applications = await User_1.default.find(filter)
            .sort({ registeredAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .select('-otp -examCredentials.password');
        const total = await User_1.default.countDocuments(filter);
        res.json({
            success: true,
            applications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Get applications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/applications/:id/accept', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status !== 'verified') {
            return res.status(400).json({ error: 'User must be verified first' });
        }
        const password = Math.random().toString(36).slice(-8).toUpperCase();
        user.status = 'accepted';
        user.acceptedAt = new Date();
        user.examCredentials = {
            username: user.email,
            password: password
        };
        user.adminNotes = adminNotes;
        await user.save();
        appGlobals_1.logger.info(`Application accepted for user: ${user.email}`);
        res.json({
            success: true,
            message: 'Application accepted successfully',
            credentials: {
                username: user.email,
                password: password
            }
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Accept application error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/applications/:id/reject', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.status = 'rejected';
        user.rejectedAt = new Date();
        user.adminNotes = adminNotes;
        await user.save();
        appGlobals_1.logger.info(`Application rejected for user: ${user.email}`);
        res.json({
            success: true,
            message: 'Application rejected successfully'
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Reject application error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/applications/:id/send-credentials', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status !== 'accepted') {
            return res.status(400).json({ error: 'User must be accepted first' });
        }
        if (!user.examCredentials) {
            return res.status(400).json({ error: 'No credentials generated for user' });
        }
        await (0, emailService_1.sendCredentialsEmail)(user);
        user.credentialsSentAt = new Date();
        await user.save();
        appGlobals_1.logger.info(`Credentials sent manually for user: ${user.email}`);
        res.json({
            success: true,
            message: 'Credentials sent successfully'
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Send credentials error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/results', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const attempts = await Attempt_1.default.find({ submittedAt: { $exists: true } })
            .populate('userId', 'firstName lastName email')
            .sort({ submittedAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Attempt_1.default.countDocuments({ submittedAt: { $exists: true } });
        res.json({
            success: true,
            attempts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Get results error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/cheating-events', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const attempts = await Attempt_1.default.find({
            'cheatingEvents.0': { $exists: true }
        })
            .populate('userId', 'firstName lastName email')
            .select('userId cheatingEvents score autoSubmitted')
            .sort({ 'cheatingEvents.time': -1 });
        res.json({
            success: true,
            attempts
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Get cheating events error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/questions', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const questions = req.body;
        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: 'Questions must be an array' });
        }
        const insertedQuestions = await Question_1.default.insertMany(questions);
        res.json({
            success: true,
            message: `${insertedQuestions.length} questions added successfully`,
            questions: insertedQuestions
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Add questions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/stats', auth_1.adminAuthMiddleware, async (req, res) => {
    try {
        const [totalUsers, pendingUsers, verifiedUsers, acceptedUsers, rejectedUsers, totalAttempts, completedAttempts, totalQuestions] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ status: 'pending' }),
            User_1.default.countDocuments({ status: 'verified' }),
            User_1.default.countDocuments({ status: 'accepted' }),
            User_1.default.countDocuments({ status: 'rejected' }),
            Attempt_1.default.countDocuments(),
            Attempt_1.default.countDocuments({ submittedAt: { $exists: true } }),
            Question_1.default.countDocuments()
        ]);
        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    pending: pendingUsers,
                    verified: verifiedUsers,
                    accepted: acceptedUsers,
                    rejected: rejectedUsers
                },
                exams: {
                    totalAttempts,
                    completedAttempts
                },
                questions: {
                    total: totalQuestions
                }
            }
        });
    }
    catch (error) {
        appGlobals_1.logger.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map