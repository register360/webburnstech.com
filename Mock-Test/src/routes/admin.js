const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const Audit = require('../models/Audit');
const { authenticateAdmin, getClientIP } = require('../middleware/auth');
const { generateExamPassword } = require('../utils/passwordGenerator');
const { sendCredentialsEmail, sendRejectionEmail } = require('../utils/email');
const { validate, applicationActionSchema } = require('../middleware/validation');

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = getClientIP(req);
    
    // Verify admin credentials
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Generate admin JWT
      const token = jwt.sign(
        { 
          isAdmin: true,
          username,
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      await Audit.log(null, 'admin_login_success', { username, ip }, ip);
      
      res.json({
        success: true,
        message: 'Admin login successful',
        token,
      });
    } else {
      await Audit.log(null, 'admin_login_failed', { username, ip }, ip);
      
      res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// GET /api/admin/applications - Get all applications
router.get('/applications', authenticateAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const users = await User.find(query)
      .sort({ registeredAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      applications: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
    });
  }
});

// GET /api/admin/applications/:id - Get single application
router.get('/applications/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }
    
    res.json({
      success: true,
      application: user,
    });
    
  } catch (error) {
    console.error('Failed to fetch application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application',
    });
  }
});

// POST /api/admin/applications/:id/accept - Accept application
router.post('/applications/:id/accept', authenticateAdmin, validate(applicationActionSchema), async (req, res) => {
  try {
    const { adminNotes } = req.validatedData;
    const ip = getClientIP(req);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }
    
    if (user.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Application already accepted',
      });
    }
    
    // Generate exam password (plain text)
    const plainPassword = generateExamPassword();
    
    // Update user
    user.status = 'accepted';
    user.acceptedAt = new Date();
    user.examPassword = plainPassword; // Will be hashed by pre-save hook
    if (adminNotes) user.adminNotes = adminNotes;
    
    await user.save();
    
    // Send credentials email immediately
    // (Note: Password is now hashed, but we need to send plain password in email)
    // Solution: Send email before saving, or store plain password temporarily
    try {
      await sendCredentialsEmail(user.email, user.firstName, plainPassword);
      user.credentialsSentAt = new Date();
      await user.save();
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError);
      // Continue even if email fails - admin can resend manually
    }
    
    // Log audit event
    await Audit.log(user._id, 'application_accepted', {
      adminUsername: req.admin.username,
      acceptedAt: user.acceptedAt,
      ip,
    }, ip);
    
    res.json({
      success: true,
      message: 'Application accepted and credentials sent',
      application: user,
    });
    
  } catch (error) {
    console.error('Failed to accept application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept application',
    });
  }
});

// POST /api/admin/applications/:id/reject - Reject application
router.post('/applications/:id/reject', authenticateAdmin, validate(applicationActionSchema), async (req, res) => {
  try {
    const { adminNotes } = req.validatedData;
    const ip = getClientIP(req);
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
      });
    }
    
    if (user.status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Application already rejected',
      });
    }
    
    // Update user
    user.status = 'rejected';
    user.rejectedAt = new Date();
    if (adminNotes) user.adminNotes = adminNotes;
    
    await user.save();
    
    // Send rejection email
    try {
      await sendRejectionEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }
    
    // Log audit event
    await Audit.log(user._id, 'application_rejected', {
      adminUsername: req.admin.username,
      rejectedAt: user.rejectedAt,
      ip,
    }, ip);
    
    res.json({
      success: true,
      message: 'Application rejected and notification sent',
      application: user,
    });
    
  } catch (error) {
    console.error('Failed to reject application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject application',
    });
  }
});

// GET /api/admin/attempts - Get all exam attempts
router.get('/attempts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    
    const query = {};
    if (userId) {
      query.userId = userId;
    }
    
    const attempts = await Attempt.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ startAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Attempt.countDocuments(query);
    
    res.json({
      success: true,
      attempts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attempts',
    });
  }
});

// GET /api/admin/attempts/:id - Get attempt details with cheating events
router.get('/attempts/:id', authenticateAdmin, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone city state')
      .populate('answers.qId', 'questionText options correctOptionIndex');
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: 'Attempt not found',
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
      error: 'Failed to fetch attempt',
    });
  }
});

// GET /api/admin/stats - Get statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      pendingApplications,
      verifiedApplications,
      acceptedApplications,
      rejectedApplications,
      totalAttempts,
      submittedAttempts,
      autoSubmittedCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'verified' }),
      User.countDocuments({ status: 'accepted' }),
      User.countDocuments({ status: 'rejected' }),
      Attempt.countDocuments(),
      Attempt.countDocuments({ submittedAt: { $ne: null } }),
      Attempt.countDocuments({ autoSubmitted: true }),
    ]);
    
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          pending: pendingApplications,
          verified: verifiedApplications,
          accepted: acceptedApplications,
          rejected: rejectedApplications,
        },
        attempts: {
          total: totalAttempts,
          submitted: submittedAttempts,
          autoSubmitted: autoSubmittedCount,
          inProgress: totalAttempts - submittedAttempts,
        },
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

module.exports = router;
