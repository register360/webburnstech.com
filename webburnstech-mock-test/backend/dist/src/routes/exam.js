"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const Question_1 = __importDefault(require("../models/Question"));
const Attempt_1 = __importDefault(require("../models/Attempt"));
const server_1 = require("../../server");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get questions for exam
router.get('/questions', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user has an active attempt
        const activeAttempt = await Attempt_1.default.findOne({
            userId: req.user.userId,
            submittedAt: { $exists: false }
        });
        if (activeAttempt) {
            return res.status(400).json({
                error: 'You already have an active exam session'
            });
        }
        // Get 75 questions with distribution
        const questionDistribution = [
            { topic: 'Python', difficulty: 'low', count: 5 },
            { topic: 'Python', difficulty: 'medium', count: 5 },
            { topic: 'Python', difficulty: 'high', count: 2 },
            { topic: 'Java', difficulty: 'low', count: 5 },
            { topic: 'Java', difficulty: 'medium', count: 5 },
            { topic: 'Java', difficulty: 'high', count: 2 },
            { topic: 'JS', difficulty: 'low', count: 5 },
            { topic: 'JS', difficulty: 'medium', count: 5 },
            { topic: 'JS', difficulty: 'high', count: 2 },
            { topic: 'C', difficulty: 'low', count: 4 },
            { topic: 'C', difficulty: 'medium', count: 4 },
            { topic: 'C++', difficulty: 'low', count: 4 },
            { topic: 'C++', difficulty: 'medium', count: 4 },
            { topic: 'Node.js', difficulty: 'low', count: 5 },
            { topic: 'Node.js', difficulty: 'medium', count: 5 },
            { topic: 'Node.js', difficulty: 'high', count: 2 },
            { topic: 'Tech', difficulty: 'low', count: 6 },
            { topic: 'Tech', difficulty: 'medium', count: 6 },
            { topic: 'Tech', difficulty: 'high', count: 4 }
        ];
        let questions = [];
        for (const dist of questionDistribution) {
            const topicQuestions = await Question_1.default.aggregate([
                { $match: { topic: dist.topic, difficulty: dist.difficulty } },
                { $sample: { size: dist.count } },
                { $project: { correctOptionIndex: 0, explanation: 0 } }
            ]);
            questions = questions.concat(topicQuestions);
        }
        // Shuffle questions
        questions = questions.sort(() => Math.random() - 0.5);
        res.json({
            success: true,
            questions: questions.slice(0, 75) // Ensure exactly 75 questions
        });
    }
    catch (error) {
        server_1.logger.error('Get questions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Start exam attempt
router.post('/attempts/start', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check exam time (30-11-2025 16:00–18:00 IST)
        const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST in UTC
        const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST in UTC
        const now = new Date();
        if (now < examStart || now > examEnd) {
            return res.status(403).json({
                error: 'Exam can only be started during 16:00–18:00 IST on 30-11-2025'
            });
        }
        // Check for existing active attempt
        const existingAttempt = await Attempt_1.default.findOne({
            userId: req.user.userId,
            submittedAt: { $exists: false }
        });
        if (existingAttempt) {
            return res.json({
                success: true,
                attempt: existingAttempt,
                message: 'Existing attempt found'
            });
        }
        // Create new attempt
        const startAt = new Date();
        const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        const singleSessionKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const attempt = new Attempt_1.default({
            userId: req.user.userId,
            examDate: '2025-11-30',
            startAt,
            endAt,
            durationSec: 7200,
            answers: [],
            autoSubmitted: false,
            cheatingEvents: [],
            logs: [],
            singleSessionKey
        });
        await attempt.save();
        // Store session in Redis
        const sessionKey = `exam_session:${req.user.userId}`;
        await server_1.redisClient.setEx(sessionKey, 7200, singleSessionKey);
        server_1.logger.info(`Exam started for user: ${req.user.userId}`);
        res.json({
            success: true,
            attempt: {
                _id: attempt._id,
                startAt: attempt.startAt,
                endAt: attempt.endAt,
                singleSessionKey: attempt.singleSessionKey
            }
        });
    }
    catch (error) {
        server_1.logger.error('Start exam error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Save answer
router.post('/attempts/:attemptId/save', auth_1.authMiddleware, async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { qId, selectedIndex, isMarkedForReview } = req.body;
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            userId: req.user.userId
        });
        if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        if (attempt.submittedAt) {
            return res.status(400).json({ error: 'Exam already submitted' });
        }
        // Check if time is up
        if (new Date() > attempt.endAt) {
            await autoSubmitAttempt(attempt);
            return res.status(400).json({ error: 'Time is up. Exam auto-submitted.' });
        }
        // Update or add answer
        const existingAnswerIndex = attempt.answers.findIndex((answer) => answer.qId.toString() === qId);
        if (existingAnswerIndex > -1) {
            attempt.answers[existingAnswerIndex].selectedIndex = selectedIndex;
            attempt.answers[existingAnswerIndex].isMarkedForReview = isMarkedForReview || false;
            attempt.answers[existingAnswerIndex].savedAt = new Date();
        }
        else {
            attempt.answers.push({
                qId: new mongoose_1.default.Types.ObjectId(qId),
                selectedIndex,
                isMarkedForReview: isMarkedForReview || false,
                savedAt: new Date()
            });
        }
        await attempt.save();
        res.json({ success: true });
    }
    catch (error) {
        server_1.logger.error('Save answer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Log cheating event
router.post('/attempts/:attemptId/cheating-event', auth_1.authMiddleware, async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { type, details } = req.body;
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            userId: req.user.userId
        });
        if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        // Add cheating event
        attempt.cheatingEvents.push({
            type,
            details,
            time: new Date()
        });
        // Check threshold for auto-submission
        const warningCount = attempt.cheatingEvents.filter((event) => event.type === 'tabChange' || event.type === 'unauthorizedFocus').length;
        if (warningCount >= 3) {
            await autoSubmitAttempt(attempt, 'Excessive cheating events detected');
            return res.json({
                success: true,
                autoSubmitted: true,
                message: 'Exam auto-submitted due to multiple violations'
            });
        }
        await attempt.save();
        server_1.logger.warn(`Cheating event recorded for user ${req.user.userId}: ${type}`);
        res.json({
            success: true,
            warningCount,
            message: `Warning ${warningCount}/3: ${getWarningMessage(type)}`
        });
    }
    catch (error) {
        server_1.logger.error('Cheating event error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Submit exam
router.post('/attempts/:attemptId/submit', auth_1.authMiddleware, async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            userId: req.user.userId
        }).populate('answers.qId');
        if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        if (attempt.submittedAt) {
            return res.status(400).json({ error: 'Exam already submitted' });
        }
        await gradeAndSubmitAttempt(attempt);
        res.json({
            success: true,
            score: attempt.score,
            totalQuestions: attempt.answers.length,
            submittedAt: attempt.submittedAt
        });
    }
    catch (error) {
        server_1.logger.error('Submit exam error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get attempt status
router.get('/attempts/:attemptId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt_1.default.findOne({
            _id: attemptId,
            userId: req.user.userId
        });
        if (!attempt) {
            return res.status(404).json({ error: 'Attempt not found' });
        }
        res.json({
            success: true,
            attempt: {
                _id: attempt._id,
                startAt: attempt.startAt,
                endAt: attempt.endAt,
                submittedAt: attempt.submittedAt,
                answers: attempt.answers,
                cheatingEvents: attempt.cheatingEvents,
                autoSubmitted: attempt.autoSubmitted
            }
        });
    }
    catch (error) {
        server_1.logger.error('Get attempt error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Helper functions
async function autoSubmitAttempt(attempt, reason = 'Time up') {
    attempt.autoSubmitted = true;
    attempt.submittedAt = new Date();
    attempt.logs.push({
        type: 'auto_submit',
        reason,
        timestamp: new Date()
    });
    await gradeAndSubmitAttempt(attempt);
    server_1.logger.info(`Exam auto-submitted for user ${attempt.userId}: ${reason}`);
}
async function gradeAndSubmitAttempt(attempt) {
    let score = 0;
    let correctAnswers = 0;
    for (const answer of attempt.answers) {
        if (answer.selectedIndex !== undefined && answer.selectedIndex !== null) {
            const question = await Question_1.default.findById(answer.qId);
            if (question && answer.selectedIndex === question.correctOptionIndex) {
                score += 3; // 3 marks per question
                correctAnswers++;
            }
        }
    }
    attempt.score = score;
    attempt.submittedAt = new Date();
    await attempt.save();
    server_1.logger.info(`Exam graded for user ${attempt.userId}: Score ${score}`);
}
function getWarningMessage(type) {
    const messages = {
        tabChange: 'Do not switch tabs or windows',
        unauthorizedFocus: 'Keep the exam window focused',
        copy: 'Copying is not allowed',
        paste: 'Pasting is not allowed',
        multipleTabs: 'Multiple tabs detected'
    };
    return messages[type] || 'Suspicious activity detected';
}
exports.default = router;
