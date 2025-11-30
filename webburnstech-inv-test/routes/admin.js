const express = require('express');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const Contact = require('../models/Contact');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../utils/emailService');
const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const adminToken = req.header('X-Admin-Token');
    
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Admin access denied'
      });
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
};

// Get dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      users: {
        total: await User.countDocuments(),
        pending: await User.countDocuments({ status: 'pending' }),
        verified: await User.countDocuments({ status: 'verified' }),
        accepted: await User.countDocuments({ status: 'accepted' }),
        rejected: await User.countDocuments({ status: 'rejected' })
      },
      exams: {
        totalAttempts: await Attempt.countDocuments(),
        completedAttempts: await Attempt.countDocuments({ submittedAt: { $ne: null } }),
        averageScore: await Attempt.aggregate([
          { $match: { submittedAt: { $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: '$score' } } }
        ])
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

// Get applications with pagination
router.get('/applications', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const applications = await User.find(query)
      .sort({ registeredAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-otp -examPassword');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get applications'
    });
  }
});

// Get application details
router.get('/applications/:id', authenticateAdmin, async (req, res) => {
  try {
    const application = await User.findById(req.params.id)
      .select('-otp -examPassword');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get application'
    });
  }
});

// Accept application
router.post('/applications/:id/accept', authenticateAdmin, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: 'User must be verified before acceptance'
      });
    }

    // Generate exam password
    const examPassword = Math.random().toString(36).slice(-8);
    
    user.status = 'accepted';
    user.acceptedAt = new Date();
    user.examPassword = examPassword;
    user.adminNotes = adminNotes;
    await user.save();

    // Log acceptance
    await AuditLog.create({
      userId: user._id,
      event: 'APPLICATION_ACCEPTED',
      details: { adminNotes }
    });

    res.json({
      success: true,
      message: 'Application accepted successfully'
    });

  } catch (error) {
    console.error('Accept application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept application'
    });
  }
});

// Reject application
router.post('/applications/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    if (!adminNotes) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.status = 'rejected';
    user.rejectedAt = new Date();
    user.adminNotes = adminNotes;
    await user.save();

    // Send rejection email
    await sendEmail({
      to: user.email,
      subject: 'WebburnsTech — Application update',
      html: `
        <h2>Application Status Update</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your interest in the WebburnsTech Mock Test.</p>
        <p>After careful review, we regret to inform you that your application has not been accepted at this time.</p>
        <p><strong>Reason:</strong> ${adminNotes}</p>
        <p>We encourage you to continue your learning journey and wish you the best in your future endeavors.</p>
        <p>Best regards,<br>WebburnsTech Team</p>
      `
    });

    // Log rejection
    await AuditLog.create({
      userId: user._id,
      event: 'APPLICATION_REJECTED',
      details: { adminNotes }
    });

    res.json({
      success: true,
      message: 'Application rejected successfully'
    });

  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject application'
    });
  }
});

// Get exam results
router.get('/results', authenticateAdmin, async (req, res) => {
  try {
    const results = await Attempt.find({ submittedAt: { $ne: null } })
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get results'
    });
  }
});

// Get cheating events
router.get('/cheating-events', authenticateAdmin, async (req, res) => {
  try {
    const attempts = await Attempt.find({
      'cheatingEvents.0': { $exists: true }
    })
    .populate('userId', 'firstName lastName email')
    .select('cheatingEvents userId score submittedAt');

    res.json({
      success: true,
      attempts
    });

  } catch (error) {
    console.error('Get cheating events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cheating events'
    });
  }
});

// Add question
router.post('/questions', authenticateAdmin, async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();

    res.json({
      success: true,
      question
    });

  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add question'
    });
  }
});

// Bulk upload questions
router.post('/questions/bulk', authenticateAdmin, async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'Questions must be an array'
      });
    }

    const result = await Question.insertMany(questions);

    res.json({
      success: true,
      insertedCount: result.length,
      questions: result
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload questions'
    });
  }
});

router.post('/send', authenticateAdmin, async (req, res) => {
  try {
    const acceptedUsers = await User.find({ 
      status: 'accepted'
    });

    for (const user of acceptedUsers) {
      const password = Math.random().toString(36).slice(-8);
      
      user.examPassword = password;
      user.credentialsSentAt = new Date();
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'WebburnsTech — Exam credentials',
        html: `
          <h2>WebburnsTech Mock Test - Exam Credentials</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your application has been ACCEPTED.</p>
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: 30th November 2025</li>
            <li>Time: 16:00 – 18:00 IST</li>
          </ul>
          <p><strong>Your exam credentials:</strong></p>
          <p>Username: ${user.email}</p>
          <p>Password: ${password}</p>
          <a herf="https://test.webburnstech.dev/login.html">Start Exam Now</a>
          <p><strong>Important Instructions:</strong></p>
          <ul>
            <li>Login will be available from 14:00 IST</li>
            <li>Exam strictly runs from 16:00–18:00 IST</li>
            <li>Do not switch tabs/windows during exam</li>
            <li>Any suspicious activity may lead to disqualification</li>
          </ul> 
          <p>Good luck!</p>
          <p>WebburnsTech Team</p>
        `
      });
    }

    console.log(`Sent credentials to ${acceptedUsers.length} users`);
    
    return res.json({
      success: true,
      sentCount: acceptedUsers.length,
      message: "Credentials sent to all accepted users."
    });
    
  } catch (error) {
    console.error('Error sending exam credentials:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send credentials.'
    });
    
  }
});

module.exports = router;
