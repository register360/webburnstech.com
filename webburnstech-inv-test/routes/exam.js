const express = require('express');
const jwt = require('jsonwebtoken');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// Redis client with fallback
let redisClient;
try {
    redisClient = require('../server.js').redisClient;
} catch (error) {
    console.warn('Redis client not available, using in-memory fallback');
    // In-memory fallback storage
    const memoryStore = new Map();
    redisClient = {
        async setEx(key, seconds, value) {
            memoryStore.set(key, value);
            setTimeout(() => memoryStore.delete(key), seconds * 1000);
            return 'OK';
        },
        async get(key) {
            return memoryStore.get(key) || null;
        },
        async del(key) {
            return memoryStore.delete(key);
        },
        async exists(key) {
            return memoryStore.has(key) ? 1 : 0;
        },
        isOpen: true
    };
}

// Helper function to safely use Redis
const safeRedisSetEx = async (key, seconds, value) => {
  try {
    if (redisClient && redisClient.setEx) {
      return await redisClient.setEx(key, seconds, value);
    }
    // Fallback to in-memory storage
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), seconds * 1000);
    return 'OK';
  } catch (error) {
    console.warn('Redis setEx failed, using fallback:', error.message);
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), seconds * 1000);
    return 'OK';
  }
};

const safeRedisGet = async (key) => {
  try {
    if (redisClient && redisClient.get) {
      return await redisClient.get(key);
    }
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    return memoryStore.get(key) || null;
  } catch (error) {
    console.warn('Redis get failed, using fallback:', error.message);
    const memoryStore = global.memoryStore || (global.memoryStore = new Map());
    return memoryStore.get(key) || null;
  }
};

// Regular authentication middleware
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
    
    // Check if this is a demo session
    if (decoded.isDemo) {
      // For demo sessions, check demo session storage
      const sessionKey = `demo-session:${decoded.userId}`;
      const redisToken = await safeRedisGet(sessionKey);
      
      if (!redisToken || redisToken !== token) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired demo session'
        });
      }
    } else {
      // For regular sessions, check regular session storage
      const sessionKey = `session:${decoded.userId}`;
      const redisToken = await safeRedisGet(sessionKey);
      
      if (!redisToken || redisToken !== token) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired session'
        });
      }
    }

    req.user = decoded;
    req.isDemo = decoded.isDemo || false;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Demo authentication middleware (simplified - uses same as regular but allows demo)
const authenticateDemo = authenticate; // Use the same middleware

// Get questions for exam
router.get('/questions', authenticate, async (req, res) => {
  try {
    // Check if user has an active attempt
    const activeAttempt = await Attempt.findOne({
      userId: req.user.userId,
      submittedAt: null,
      isDemo: req.isDemo || false
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
    // Check exam timing (only for real exam, not demo)
    if (!req.isDemo) {
      const now = new Date();
      const examStart = new Date('2025-11-30T10:30:00Z'); // 16:00 IST
      const examEnd = new Date('2025-11-30T12:30:00Z'); // 18:00 IST
      
      if (now < examStart || now > examEnd) {
        return res.status(403).json({
          success: false,
          error: 'Exam can only be started during exam hours (16:00-18:00 IST)'
        });
      }
    }

    // Check for existing active attempt
    const existingAttempt = await Attempt.findOne({
      userId: req.user.userId,
      submittedAt: null,
      isDemo: req.isDemo || false
    });

    if (existingAttempt) {
      return res.json({
        success: true,
        attempt: existingAttempt,
        isDemo: req.isDemo || false
      });
    }

    // Create new attempt
    const startAt = new Date();
    const duration = req.isDemo ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000; // 30 min for demo, 2 hours for real
    const endAt = new Date(startAt.getTime() + duration);

    const attempt = new Attempt({
      userId: req.user.userId,
      startAt,
      endAt,
      isDemo: req.isDemo || false
    });

    await attempt.save();

    // Log attempt start
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: req.isDemo ? 'DEMO_EXAM_STARTED' : 'EXAM_STARTED',
      details: { attemptId: attempt._id, isDemo: req.isDemo || false }
    });

    res.json({
      success: true,
      attempt,
      isDemo: req.isDemo || false
    });

  } catch (error) {
    console.error('Start attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start exam attempt'
    });
  }
});

// Get demo questions (shorter, for practice)
router.get('/demo-questions', authenticateDemo, async (req, res) => {
  try {
    // Get 15 random questions for demo (shorter test)
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
                    { case: { $eq: ['$_id', 'low'] }, then: 6 },
                    { case: { $eq: ['$_id', 'medium'] }, then: 6 },
                    { case: { $eq: ['$_id', 'high'] }, then: 3 }
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
      { $sample: { size: 15 } },
      {
        $project: {
          correctOptionIndex: 0,
          explanation: 0
        }
      }
    ]);

    // If not enough questions, create some demo ones
    const demoQuestions = getDemoQuestions();
    if (questions.length < 15) {
      questions.push(...demoQuestions.slice(0, 15 - questions.length));
    }

    res.json({
      success: true,
      questions: questions.length >= 15 ? questions : demoQuestions.slice(0, 15),
      isDemo: true,
      duration: 30 // 30 minutes for demo
    });

  } catch (error) {
    console.error('Get demo questions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load demo questions'
    });
  }
});

// Start demo exam attempt
router.post('/demo-attempts/start', authenticateDemo, async (req, res) => {
  try {
    // Check for existing active demo attempt
    const existingAttempt = await Attempt.findOne({
      userId: req.user.userId,
      submittedAt: null,
      isDemo: true
    });

    if (existingAttempt) {
      return res.json({
        success: true,
        attempt: existingAttempt,
        isDemo: true
      });
    }

    // Create new demo attempt (shorter duration)
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000); // 30 minutes for demo

    const attempt = new Attempt({
      userId: req.user.userId,
      startAt,
      endAt,
      isDemo: true // Mark as demo attempt
    });

    await attempt.save();

    // Log demo attempt start
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: 'DEMO_EXAM_STARTED',
      details: { attemptId: attempt._id, isDemo: true }
    });

    res.json({
      success: true,
      attempt,
      isDemo: true
    });

  } catch (error) {
    console.error('Start demo attempt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start demo exam'
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

// Save demo answer
router.post('/demo-attempts/:attemptId/save', authenticateDemo, async (req, res) => {
  try {
    const { qId, selectedIndex, isMarkedForReview } = req.body;
    const attemptId = req.params.attemptId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user.userId,
      isDemo: true
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Demo attempt not found'
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        error: 'Demo exam already submitted'
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
      message: 'Answer saved successfully',
      isDemo: true
    });

  } catch (error) {
    console.error('Save demo answer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save demo answer'
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

// Submit demo exam
router.post('/demo-attempts/:attemptId/submit', authenticateDemo, async (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user.userId,
      isDemo: true
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Demo attempt not found'
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        error: 'Demo exam already submitted'
      });
    }

    attempt.submittedAt = new Date();
    attempt.durationSec = Math.floor((attempt.submittedAt - attempt.startAt) / 1000);
    
    // Calculate score
    await attempt.calculateScore();
    await attempt.save();

    // Log demo submission
    await AuditLog.create({
      userId: req.user.userId,
      ip: req.ip,
      event: 'DEMO_EXAM_SUBMITTED',
      details: { 
        attemptId, 
        score: attempt.score, 
        isDemo: true,
        duration: attempt.durationSec 
      }
    });

    res.json({
      success: true,
      score: attempt.score,
      totalQuestions: attempt.answers.length,
      duration: attempt.durationSec,
      isDemo: true
    });

  } catch (error) {
    console.error('Submit demo exam error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit demo exam'
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

function getDemoQuestions() {
  return [
    {
      _id: 'demo1',
      question: 'What is the time complexity of binary search algorithm?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      difficulty: 'medium',
      correctOptionIndex: 1
    },
    {
      _id: 'demo2',
      question: 'Which data structure follows LIFO (Last In First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      difficulty: 'low',
      correctOptionIndex: 1
    },
    {
      _id: 'demo3',
      question: 'What does HTML stand for?',
      options: [
        'Hyper Text Markup Language',
        'High Tech Modern Language',
        'Hyper Transfer Markup Language',
        'Home Tool Markup Language'
      ],
      difficulty: 'low',
      correctOptionIndex: 0
    },
    {
      _id: 'demo4',
      question: 'Which of the following is not a JavaScript data type?',
      options: ['String', 'Boolean', 'Integer', 'Undefined'],
      difficulty: 'medium',
      correctOptionIndex: 2
    },
    {
      _id: 'demo5',
      question: 'What is the output of: console.log(typeof null) in JavaScript?',
      options: ['null', 'undefined', 'object', 'number'],
      difficulty: 'high',
      correctOptionIndex: 2
    },
    {
      _id: 'demo6',
      question: 'Which protocol is used for secure web communication?',
      options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'],
      difficulty: 'low',
      correctOptionIndex: 2
    },
    {
      _id: 'demo7',
      question: 'What is the main purpose of CSS?',
      options: [
        'To add interactivity to web pages',
        'To structure web content',
        'To style and layout web pages',
        'To store data on the client side'
      ],
      difficulty: 'low',
      correctOptionIndex: 2
    },
    {
      _id: 'demo8',
      question: 'Which symbol is used for single-line comments in JavaScript?',
      options: ['//', '/*', '#', '--'],
      difficulty: 'low',
      correctOptionIndex: 0
    },
    {
      _id: 'demo9',
      question: 'What is React.js primarily used for?',
      options: [
        'Backend development',
        'Database management',
        'Building user interfaces',
        'Mobile app development only'
      ],
      difficulty: 'medium',
      correctOptionIndex: 2
    },
    {
      _id: 'demo10',
      question: 'Which method is used to add an element to the end of an array in JavaScript?',
      options: ['push()', 'pop()', 'shift()', 'unshift()'],
      difficulty: 'medium',
      correctOptionIndex: 0
    },
    {
      _id: 'demo11',
      question: 'What is a closure in JavaScript?',
      options: [
        'A function that has access to its outer function scope',
        'A way to close a web page',
        'A method to hide variables',
        'A type of loop'
      ],
      difficulty: 'high',
      correctOptionIndex: 0
    },
    {
      _id: 'demo12',
      question: 'Which database is known as a NoSQL database?',
      options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite'],
      difficulty: 'medium',
      correctOptionIndex: 2
    },
    {
      _id: 'demo13',
      question: 'What is the purpose of the "use strict" directive in JavaScript?',
      options: [
        'To make JavaScript run faster',
        'To enforce stricter parsing and error handling',
        'To enable new features',
        'To improve security'
      ],
      difficulty: 'high',
      correctOptionIndex: 1
    },
    {
      _id: 'demo14',
      question: 'Which HTML tag is used for the largest heading?',
      options: ['<h6>', '<heading>', '<h1>', '<head>'],
      difficulty: 'low',
      correctOptionIndex: 2
    },
    {
      _id: 'demo15',
      question: 'What does API stand for?',
      options: [
        'Application Programming Interface',
        'Advanced Programming Instruction',
        'Automated Program Interaction',
        'Application Process Integration'
      ],
      difficulty: 'low',
      correctOptionIndex: 0
    }
  ];
}

module.exports = router;
