const express = require('express');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const Contact = require('../models/Contact');
const { logger } = require('../../server');
const { adminAuthMiddleware } = require('../middleware/auth');
const { sendCredentialsEmail } = require('../services/emailService');

const router = express.Router();

// Get all applications
router.get('/applications', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const applications = await User.find(filter)
      .sort({ registeredAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-otp -examCredentials.password');

    const total = await User.countDocuments(filter);

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

  } catch (error) {
    logger.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept application
router.post('/applications/:id/accept', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'verified') {
      return res.status(400).json({ error: 'User must be verified first' });
    }

    // Generate exam credentials
    const password = Math.random().toString(36).slice(-8).toUpperCase();

    user.status = 'accepted';
    user.acceptedAt = new Date();
    user.examCredentials = {
      username: user.email,
      password: password
    };
    user.adminNotes = adminNotes;

    await user.save();

    logger.info(`Application accepted for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Application accepted successfully',
      credentials: {
        username: user.email,
        password: password
      }
    });

  } catch (error) {
    logger.error('Accept application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject application
router.post('/applications/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = 'rejected';
    user.rejectedAt = new Date();
    user.adminNotes = adminNotes;

    await user.save();

    logger.info(`Application rejected for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Application rejected successfully'
    });

  } catch (error) {
    logger.error('Reject application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send credentials manually
router.post('/applications/:id/send-credentials', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'accepted') {
      return res.status(400).json({ error: 'User must be accepted first' });
    }

    if (!user.examCredentials) {
      return res.status(400).json({ error: 'No credentials generated for user' });
    }

    await sendCredentialsEmail(user);
    
    user.credentialsSentAt = new Date();
    await user.save();

    logger.info(`Credentials sent manually for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Credentials sent successfully'
    });

  } catch (error) {
    logger.error('Send credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exam results
router.get('/results', adminAuthMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const attempts = await Attempt.find({ submittedAt: { $exists: true } })
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Attempt.countDocuments({ submittedAt: { $exists: true } });

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

  } catch (error) {
    logger.error('Get results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cheating events
router.get('/cheating-events', adminAuthMiddleware, async (req, res) => {
  try {
    const attempts = await Attempt.find({
      'cheatingEvents.0': { $exists: true }
    })
    .populate('userId', 'firstName lastName email')
    .select('userId cheatingEvents score autoSubmitted')
    .sort({ 'cheatingEvents.time': -1 });

    res.json({
      success: true,
      attempts
    });

  } catch (error) {
    logger.error('Get cheating events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add questions
router.post('/questions', adminAuthMiddleware, async (req, res) => {
  try {
    const questions = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }

    const insertedQuestions = await Question.insertMany(questions);

    res.json({
      success: true,
      message: `${insertedQuestions.length} questions added successfully`,
      questions: insertedQuestions
    });

  } catch (error) {
    logger.error('Add questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system stats
router.get('/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      verifiedUsers,
      acceptedUsers,
      rejectedUsers,
      totalAttempts,
      completedAttempts,
      totalQuestions,
      totalContacts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'verified' }),
      User.countDocuments({ status: 'accepted' }),
      User.countDocuments({ status: 'rejected' }),
      Attempt.countDocuments(),
      Attempt.countDocuments({ submittedAt: { $exists: true } }),
      Question.countDocuments(),
      Contact.countDocuments()
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
        },
        contacts: {
          total: totalContacts
        }
      }
    });

  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;