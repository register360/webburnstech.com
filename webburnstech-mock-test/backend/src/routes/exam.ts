import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Question from '../models/Question';
import Attempt from '../models/Attempt';
import { redisClient, logger } from '../../server';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get questions for exam
router.get('/questions', authMiddleware, async (req: any, res) => {
  try {
    // Check if user has an active attempt
    const activeAttempt = await Attempt.findOne({
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

    let questions: any[] = [];
    
    for (const dist of questionDistribution) {
      const topicQuestions = await Question.aggregate([
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

  } catch (error) {
    logger.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start exam attempt
router.post('/attempts/start', authMiddleware, async (req: any, res) => {
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
    const existingAttempt = await Attempt.findOne({
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

    const attempt = new Attempt({
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
    await redisClient.setEx(sessionKey, 7200, singleSessionKey);

    logger.info(`Exam started for user: ${req.user.userId}`);

    res.json({
      success: true,
      attempt: {
        _id: attempt._id,
        startAt: attempt.startAt,
        endAt: attempt.endAt,
        singleSessionKey: attempt.singleSessionKey
      }
    });

  } catch (error) {
    logger.error('Start exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save answer
router.post('/attempts/:attemptId/save', authMiddleware, async (req: any, res) => {
  try {
    const { attemptId } = req.params;
    const { qId, selectedIndex, isMarkedForReview } = req.body;

    const attempt = await Attempt.findOne({
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
    const existingAnswerIndex = attempt.answers.findIndex(
      (answer: any) => answer.qId.toString() === qId
    );

    if (existingAnswerIndex > -1) {
      attempt.answers[existingAnswerIndex].selectedIndex = selectedIndex;
      attempt.answers[existingAnswerIndex].isMarkedForReview = isMarkedForReview || false;
      attempt.answers[existingAnswerIndex].savedAt = new Date();
    } else {
      attempt.answers.push({
        qId: new mongoose.Types.ObjectId(qId),
        selectedIndex,
        isMarkedForReview: isMarkedForReview || false,
        savedAt: new Date()
      });
    }

    await attempt.save();

    res.json({ success: true });

  } catch (error) {
    logger.error('Save answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log cheating event
router.post('/attempts/:attemptId/cheating-event', authMiddleware, async (req: any, res) => {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body;

    const attempt = await Attempt.findOne({
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
    const warningCount = attempt.cheatingEvents.filter(
      (event: any) => event.type === 'tabChange' || event.type === 'unauthorizedFocus'
    ).length;

    if (warningCount >= 3) {
      await autoSubmitAttempt(attempt, 'Excessive cheating events detected');
      return res.json({ 
        success: true, 
        autoSubmitted: true,
        message: 'Exam auto-submitted due to multiple violations'
      });
    }

    await attempt.save();

    logger.warn(`Cheating event recorded for user ${req.user.userId}: ${type}`);

    res.json({ 
      success: true, 
      warningCount,
      message: `Warning ${warningCount}/3: ${getWarningMessage(type)}`
    });

  } catch (error) {
    logger.error('Cheating event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit exam
router.post('/attempts/:attemptId/submit', authMiddleware, async (req: any, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findOne({
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

  } catch (error) {
    logger.error('Submit exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attempt status
router.get('/attempts/:attemptId', authMiddleware, async (req: any, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findOne({
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

  } catch (error) {
    logger.error('Get attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
async function autoSubmitAttempt(attempt: any, reason = 'Time up') {
  attempt.autoSubmitted = true;
  attempt.submittedAt = new Date();
  attempt.logs.push({
    type: 'auto_submit',
    reason,
    timestamp: new Date()
  });

  await gradeAndSubmitAttempt(attempt);
  
  logger.info(`Exam auto-submitted for user ${attempt.userId}: ${reason}`);
}

async function gradeAndSubmitAttempt(attempt: any) {
  let score = 0;
  let correctAnswers = 0;

  for (const answer of attempt.answers) {
    if (answer.selectedIndex !== undefined && answer.selectedIndex !== null) {
      const question = await Question.findById(answer.qId);
      if (question && answer.selectedIndex === question.correctOptionIndex) {
        score += 3; // 3 marks per question
        correctAnswers++;
      }
    }
  }

  attempt.score = score;
  attempt.submittedAt = new Date();

  await attempt.save();

  logger.info(`Exam graded for user ${attempt.userId}: Score ${score}`);
}

function getWarningMessage(type: string): string {
  const messages: { [key: string]: string } = {
    tabChange: 'Do not switch tabs or windows',
    unauthorizedFocus: 'Keep the exam window focused',
    copy: 'Copying is not allowed',
    paste: 'Pasting is not allowed',
    multipleTabs: 'Multiple tabs detected'
  };
  
  return messages[type] || 'Suspicious activity detected';
}

export default router;
