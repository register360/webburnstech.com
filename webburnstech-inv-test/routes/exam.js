const express = require('express');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../utils/redisClient.js');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check Redis for valid session
    const sessionKey = `session:${decoded.userId}`;
    const redisToken = await redisClient.get(sessionKey);
    
    if (!redisToken || redisToken !== token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Get questions for exam
router.get('/questions', authenticate, async (req, res) => {
  try {
    // Check if user has an active attempt
    const activeAttempt = await Attempt.findOne({
      userId: req.user.userId,
      submittedAt: null
    });

    if (activeAttempt) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active exam attempt'
      });
    }

    // Get 75 random questions (distributed by difficulty)
    const questions = await Question.aggregate([
      {
        $group: {
          _id: '$difficulty',
          questions: { $push: '$$ROOT' }
        }
      },
      {
        $project: {
          questions: {
            $slice: [
              '$questions',
              {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id', 'low'] }, then: 30 },
                    { case: { $eq: ['$_id', 'medium'] }, then: 30 },
                    { case: { $eq: ['$_id', 'high'] }, then: 15 }
                  ],
                  default: 0
                }
              }
            ]
          }
        }
      },
      { $unwind: '$questions' },
      { $replaceRoot: { newRoot: '$questions' } },
      { $sample: { size: 75 } },
      {
        $project: {
          correctOptionIndex: 0,
          explanation: 0
        }
      }
    ]);

    if (questions.length !== 75) {
      return res.status(500).json({
        success: false,
        error: 'Insufficient questions in database'
      });
    }

    res.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load questions'
    });
  }
});

// Start exam attempt
router.post('/attempts/start', authenticate, async (req, res) => {
  try {
    // Check exam timing
    const now = new Date();
    const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST
    const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST
    
    if (now < examStart || now > examEnd) {
      return res.status(403).json({
        success: false,
        error: 'Exam can only be started during exam hours (16:00-18:00 IST)'
      });
    }

    // Check for existing active attempt
    const existingAttempt = await Attempt.findOne({
      userId: req.user.userId,
      submittedAt: null
    });

    if (existingAttempt) {
      return res.json({
        success: true,
        attempt: existingAttempt
      });
    }

    // Create new attempt
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const attempt = new Attempt({
      userId: req.user.userId,
      startAt,
      endAt
    });

    await attempt.save();

    // Log attempt start
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: 'EXAM_STARTED',
      details: { attemptId: attempt._id }
    });

    res.json({
      success: true,
      attempt
    });

  } catch (error) {
    console.error('Start attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start exam attempt'
    });
  }
});

// Save answer
router.post('/attempts/:attemptId/save', authenticate, async (req, res) => {
  try {
    const { qId, selectedIndex, isMarkedForReview } = req.body;
    const attemptId = req.params.attemptId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user.userId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        error: 'Exam already submitted'
      });
    }

    // Check if time is up
    if (new Date() > attempt.endAt) {
      await autoSubmitExam(attempt);
      return res.status(400).json({
        success: false,
        error: 'Time is up. Exam auto-submitted.'
      });
    }

    // Update or add answer
    const answerIndex = attempt.answers.findIndex(a => a.qId.toString() === qId);
    
    if (answerIndex > -1) {
      attempt.answers[answerIndex].selectedIndex = selectedIndex;
      attempt.answers[answerIndex].isMarkedForReview = isMarkedForReview;
      attempt.answers[answerIndex].savedAt = new Date();
    } else {
      attempt.answers.push({
        qId,
        selectedIndex,
        isMarkedForReview,
        savedAt: new Date()
      });
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer saved successfully'
    });

  } catch (error) {
    console.error('Save answer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save answer'
    });
  }
});

// Log cheating event
router.post('/attempts/:attemptId/cheating-event', authenticate, async (req, res) => {
  try {
    const { type, details } = req.body;
    const attemptId = req.params.attemptId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user.userId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }

    // Get current warning count
    const warningCount = attempt.cheatingEvents.filter(
      event => event.type === type
    ).length + 1;

    // Add cheating event
    attempt.cheatingEvents.push({
      type,
      details,
      warningCount
    });

    // Auto-submit on 3rd warning
    if (warningCount >= 3) {
      await autoSubmitExam(attempt, true);
      return res.json({
        success: true,
        autoSubmitted: true,
        message: 'Exam auto-submitted due to multiple cheating events'
      });
    }

    await attempt.save();

    // Log cheating event
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: 'CHEATING_EVENT',
      details: { type, details, attemptId, warningCount }
    });

    res.json({
      success: true,
      warningCount,
      message: `Warning ${warningCount}/3: ${getWarningMessage(type)}`
    });

  } catch (error) {
    console.error('Cheating event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log cheating event'
    });
  }
});

// Submit exam
router.post('/attempts/:attemptId/submit', authenticate, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user.userId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        error: 'Exam already submitted'
      });
    }

    attempt.submittedAt = new Date();
    attempt.durationSec = Math.floor((attempt.submittedAt - attempt.startAt) / 1000);
    
    // Calculate score
    await attempt.calculateScore();
    await attempt.save();

    // Log submission
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: 'EXAM_SUBMITTED',
      details: { attemptId, score: attempt.score, autoSubmitted: attempt.autoSubmitted }
    });

    res.json({
      success: true,
      score: attempt.score,
      totalQuestions: attempt.answers.length,
      duration: attempt.durationSec
    });

  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit exam'
    });
  }
});

// Get attempt details
router.get('/attempts/:attemptId', authenticate, async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user.userId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found'
      });
    }

    res.json({
      success: true,
      attempt
    });

  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get attempt details'
    });
  }
});

// Helper functions
async function autoSubmitExam(attempt, isCheating = false) {
  try {
    attempt.submittedAt = new Date();
    attempt.autoSubmitted = true;
    attempt.durationSec = Math.floor((attempt.submittedAt - attempt.startAt) / 1000);
    
    if (isCheating) {
      attempt.cheatingEvents.push({
        type: 'autoSubmit',
        details: 'Auto-submitted due to cheating violations'
      });
    }
    
    await attempt.calculateScore();
    await attempt.save();

    // Log auto-submission
    await AuditLog.create({
      userId: attempt.userId,
      event: 'EXAM_AUTO_SUBMITTED',
      details: { 
        attemptId: attempt._id, 
        reason: isCheating ? 'cheating' : 'timeup',
        score: attempt.score 
      }
    });
  } catch (error) {
    console.error('Auto-submit error:', error);
  }
}

function getWarningMessage(type) {
  const messages = {
    tabChange: 'Do not switch tabs or windows. Keep the exam window focused.',
    copy: 'Copying is not allowed during the exam.',
    paste: 'Pasting is not allowed during the exam.',
    unauthorizedFocus: 'Keep the exam window active and focused.',
    multipleTabs: 'Multiple tabs detected. Please close other tabs.',
    devTools: 'Developer tools access is prohibited.'
  };
  
  return messages[type] || 'Suspicious activity detected.';
}

module.exports = router;
