const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Audit = require('../models/Audit');
const { authenticateUser, getClientIP } = require('../middleware/auth');
const { getRedisClient } = require('../config/redis');
const { validate, answerSaveSchema, cheatingEventSchema } = require('../middleware/validation');
const { answerSaveLimiter } = require('../middleware/rateLimit');

// GET /api/exam/questions - Get randomized questions
router.get('/questions', authenticateUser, async (req, res) => {
  try {
    // Get 75 randomized questions
    const questions = await Question.getRandomQuestions(75);
    
    // Remove correctOptionIndex from response
    const questionsWithoutAnswers = questions.map(q => ({
      _id: q._id,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: q.options,
    }));
    
    // Log audit event
    await Audit.log(req.userId, 'questions_fetched', { count: questions.length });
    
    res.json({
      success: true,
      questions: questionsWithoutAnswers,
    });
    
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load questions. Please try again.',
    });
  }
});

// POST /api/exam/attempts/start - Start new exam attempt
router.post('/attempts/start', authenticateUser, async (req, res) => {
  try {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    // Check if user already has an attempt
    const existingAttempt = await Attempt.findOne({
      userId: req.userId,
      examDate: process.env.EXAM_DATE || '2025-11-30',
    });
    
    if (existingAttempt) {
      // If already submitted, don't allow restart
      if (existingAttempt.submittedAt) {
        return res.status(400).json({
          success: false,
          error: 'You have already submitted your exam. Multiple attempts are not allowed.',
        });
      }
      
      // Return existing attempt (resume functionality)
      return res.json({
        success: true,
        message: 'Resuming existing exam session',
        attempt: existingAttempt,
      });
    }
    
    // Create new attempt
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    const singleSessionKey = crypto.randomBytes(32).toString('hex');
    
    const attempt = new Attempt({
      userId: req.userId,
      examDate: process.env.EXAM_DATE || '2025-11-30',
      startAt,
      endAt,
      singleSessionKey,
      ip,
      userAgent,
      answers: [],
      cheatingEvents: [],
    });
    
    await attempt.save();
    
    // Store session key in Redis
    const redis = getRedisClient();
    await redis.setex(`attempt:${attempt._id}`, 2 * 60 * 60, singleSessionKey);
    
    // Log audit event
    await Audit.log(req.userId, 'exam_started', { 
      attemptId: attempt._id,
      startAt,
      endAt,
      ip,
    }, ip);
    
    res.json({
      success: true,
      message: 'Exam started successfully',
      attempt,
    });
    
  } catch (error) {
    console.error('Failed to start exam:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start exam. Please try again.',
    });
  }
});

// GET /api/exam/attempts/:id - Get attempt details (for restore)
router.get('/attempts/:id', authenticateUser, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Exam attempt not found.',
      });
    }
    
    // Check ownership
    if (attempt.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }
    
    res.json({
      success: true,
      attempt,
    });
    
  } catch (error) {
    console.error('Failed to fetch attempt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exam details.',
    });
  }
});

// POST /api/exam/attempts/:id/save - Save answer
router.post('/attempts/:id/save', authenticateUser, answerSaveLimiter, validate(answerSaveSchema), async (req, res) => {
  try {
    const { qId, selectedIndex, isMarkedForReview } = req.validatedData;
    
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Exam attempt not found.',
      });
    }
    
    // Check ownership
    if (attempt.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }
    
    // Check if already submitted
    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        error: 'Exam already submitted. Cannot save answers.',
      });
    }
    
    // Find existing answer or create new one
    const existingAnswerIndex = attempt.answers.findIndex(
      a => a.qId.toString() === qId
    );
    
    if (existingAnswerIndex !== -1) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = {
        qId,
        selectedIndex,
        savedAt: new Date(),
        isMarkedForReview,
      };
    } else {
      // Add new answer
      attempt.answers.push({
        qId,
        selectedIndex,
        savedAt: new Date(),
        isMarkedForReview,
      });
    }
    
    await attempt.save();
    
    // Also save to Redis for quick access
    const redis = getRedisClient();
    await redis.setex(
      `answer:${attempt._id}:${qId}`,
      2 * 60 * 60,
      JSON.stringify({ selectedIndex, isMarkedForReview, savedAt: new Date() })
    );
    
    res.json({
      success: true,
      message: 'Answer saved successfully',
    });
    
  } catch (error) {
    console.error('Failed to save answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save answer. Please try again.',
    });
  }
});

// POST /api/exam/attempts/:id/cheating-event - Log cheating event
router.post('/attempts/:id/cheating-event', authenticateUser, validate(cheatingEventSchema), async (req, res) => {
  try {
    const { type, details } = req.validatedData;
    const ip = getClientIP(req);
    
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Exam attempt not found.',
      });
    }
    
    // Check ownership
    if (attempt.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }
    
    // Add cheating event
    const eventCount = attempt.addCheatingEvent(type, details);
    await attempt.save();
    
    // Increment Redis counter
    const redis = getRedisClient();
    const counterKey = `cheat:${attempt._id}`;
    await redis.incr(counterKey);
    await redis.expire(counterKey, 2 * 60 * 60);
    
    const currentCount = await redis.get(counterKey);
    
    // Log audit event
    await Audit.log(req.userId, 'cheating_event', {
      attemptId: attempt._id,
      type,
      details,
      count: currentCount,
      ip,
    }, ip);
    
    // Check if threshold exceeded
    const maxWarnings = parseInt(process.env.MAX_WARNINGS) || 3;
    
    if (parseInt(currentCount) >= maxWarnings) {
      // Auto-submit exam
      attempt.autoSubmitted = true;
      attempt.submittedAt = new Date();
      attempt.durationSec = Math.floor((new Date() - attempt.startAt) / 1000);
      
      // Calculate score
      await attempt.calculateScore();
      await attempt.save();
      
      // Clear session
      await redis.del(`session:${req.userId}`);
      await redis.del(`attempt:${attempt._id}`);
      
      await Audit.log(req.userId, 'exam_auto_submitted', {
        attemptId: attempt._id,
        reason: 'max_warnings_exceeded',
        warningCount: currentCount,
      }, ip);
      
      return res.json({
        success: true,
        warningCount: parseInt(currentCount),
        autoSubmitted: true,
        message: 'Maximum warnings exceeded. Exam has been auto-submitted.',
      });
    }
    
    res.json({
      success: true,
      warningCount: parseInt(currentCount),
      message: `Warning ${currentCount}/${maxWarnings}. Please follow exam rules.`,
    });
    
  } catch (error) {
    console.error('Failed to log cheating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log event.',
    });
  }
});

// POST /api/exam/attempts/:id/submit - Submit exam
router.post('/attempts/:id/submit', authenticateUser, async (req, res) => {
  try {
    const ip = getClientIP(req);
    
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Exam attempt not found.',
      });
    }
    
    // Check ownership
    if (attempt.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }
    
    // Check if already submitted
    if (attempt.submittedAt) {
      return res.json({
        success: true,
        message: 'Exam already submitted',
        score: attempt.score,
        totalMarks: 225,
      });
    }
    
    // Mark as submitted
    attempt.submittedAt = new Date();
    attempt.durationSec = Math.floor((new Date() - attempt.startAt) / 1000);
    
    // Calculate score
    const score = await attempt.calculateScore();
    await attempt.save();
    
    // Clear session from Redis
    const redis = getRedisClient();
    await redis.del(`session:${req.userId}`);
    await redis.del(`attempt:${attempt._id}`);
    
    // Log audit event
    await Audit.log(req.userId, 'exam_submitted', {
      attemptId: attempt._id,
      score,
      totalQuestions: attempt.answers.length,
      durationSec: attempt.durationSec,
      ip,
    }, ip);
    
    res.json({
      success: true,
      message: 'Exam submitted successfully',
      score,
      totalMarks: 225,
      answeredQuestions: attempt.answers.length,
      totalQuestions: 75,
    });
    
  } catch (error) {
    console.error('Failed to submit exam:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit exam. Please try again.',
    });
  }
});

module.exports = router;
