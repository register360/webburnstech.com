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

// Helper function to determine severity level
const getSeverityLevel = (event) => {
  const highEvents = ['CHEATING_DETECTED', 'SECURITY_VIOLATION', 'MULTIPLE_ACCOUNTS'];
  const mediumEvents = ['LOGIN_FAILED', 'PASSWORD_RESET', 'USER_UPDATED'];
  const lowEvents = ['LOGIN_SUCCESS', 'LOGOUT', 'PAGE_VISIT'];
  
  if (highEvents.includes(event)) return 'high';
  if (mediumEvents.includes(event)) return 'medium';
  if (lowEvents.includes(event)) return 'low';
  return 'info';
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
    
    // Add logs stats
    const logsStats = {
      totalLogs: await AuditLog.countDocuments(),
      todayLogs: await AuditLog.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      highSeverityLogs: await AuditLog.countDocuments({
        event: { $in: ['CHEATING_DETECTED', 'SECURITY_VIOLATION'] }
      })
    };
    
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
      stats:{logs: logsStats}
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

// ==================== AUDIT LOGS ENDPOINTS ====================

// Get all audit logs with pagination and filtering
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      event,
      userId,
      startDate,
      endDate,
      search,
      severity,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (event) {
      filter.event = event;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { 'details.description': { $regex: search, $options: 'i' } },
        { 'details.ip': { $regex: search, $options: 'i' } },
        { 'details.userAgent': { $regex: search, $options: 'i' } },
        { event: { $regex: search, $options: 'i' } }
      ];
    }

    // Add severity filter
    if (severity && severity !== 'all') {
      const eventsBySeverity = {
        high: ['CHEATING_DETECTED', 'SECURITY_VIOLATION', 'MULTIPLE_ACCOUNTS'],
        medium: ['LOGIN_FAILED', 'PASSWORD_RESET', 'USER_UPDATED', 'APPLICATION_REJECTED'],
        low: ['LOGIN_SUCCESS', 'LOGOUT', 'PAGE_VISIT', 'APPLICATION_SUBMITTED'],
        info: ['APPLICATION_ACCEPTED', 'EMAIL_SENT', 'SYSTEM_EVENT']
      };
      
      if (eventsBySeverity[severity]) {
        filter.event = { $in: eventsBySeverity[severity] };
      }
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstName lastName email userID')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);

    // Format logs for response
    const formattedLogs = logs.map(log => ({
      id: log._id,
      userId: log.userId ? {
        _id: log.userId._id,
        name: `${log.userId.firstName} ${log.userId.lastName}`,
        email: log.userId.email,
        userID: log.userId.userID
      } : null,
      ip: log.ip,
      event: log.event,
      details: log.details || {},
      timestamp: log.timestamp,
      formattedDate: new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      severity: getSeverityLevel(log.event),
      formattedDetails: JSON.stringify(log.details || {}, null, 2)
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// Get specific log by ID
router.get('/logs/:id', authenticateAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'firstName lastName email userID')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log not found'
      });
    }

    res.json({
      success: true,
      log: {
        ...log,
        formattedDate: new Date(log.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        severity: getSeverityLevel(log.event),
        formattedDetails: JSON.stringify(log.details || {}, null, 2)
      }
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log'
    });
  }
});

// Get available event types for filtering
router.get('/logs/events', authenticateAdmin, async (req, res) => {
  try {
    const events = await AuditLog.distinct('event');
    res.json({
      success: true,
      events: events.sort()
    });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event types'
    });
  }
});

// Get log statistics
router.get('/logs/stats', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate) {
      filter.timestamp = { $gte: new Date(startDate) };
    }
    if (endDate) {
      filter.timestamp = { ...filter.timestamp, $lte: new Date(endDate) };
    }

    // Get total logs
    const totalLogs = await AuditLog.countDocuments(filter);

    // Get logs by event type
    const logsByEvent = await AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get logs by user
    const logsByUser = await AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get daily activity for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await AuditLog.aggregate([
      { 
        $match: { 
          timestamp: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get severity distribution
    const severityDistribution = await AuditLog.aggregate([
      { $match: filter },
      {
        $addFields: {
          severity: {
            $switch: {
              branches: [
                { 
                  case: { $in: ['$event', ['CHEATING_DETECTED', 'SECURITY_VIOLATION', 'MULTIPLE_ACCOUNTS']] }, 
                  then: 'high' 
                },
                { 
                  case: { $in: ['$event', ['LOGIN_FAILED', 'PASSWORD_RESET', 'USER_UPDATED', 'APPLICATION_REJECTED']] }, 
                  then: 'medium' 
                },
                { 
                  case: { $in: ['$event', ['LOGIN_SUCCESS', 'LOGOUT', 'PAGE_VISIT', 'APPLICATION_SUBMITTED']] }, 
                  then: 'low' 
                }
              ],
              default: 'info'
            }
          }
        }
      },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalLogs,
        events: logsByEvent,
        topUsers: logsByUser,
        dailyActivity,
        severityDistribution,
        timeRange: {
          startDate: startDate || thirtyDaysAgo.toISOString(),
          endDate: endDate || new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching log statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log statistics'
    });
  }
});

// Search logs by user
router.get('/logs/search/user', authenticateAdmin, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Find users matching the query
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { userID: { $regex: query, $options: 'i' } }
      ]
    }).select('_id');

    const userIds = users.map(user => user._id);

    // Get logs for these users
    const logs = await AuditLog.find({ userId: { $in: userIds } })
      .populate('userId', 'firstName lastName email userID')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const formattedLogs = logs.map(log => ({
      id: log._id,
      userId: log.userId ? {
        _id: log.userId._id,
        name: `${log.userId.firstName} ${log.userId.lastName}`,
        email: log.userId.email,
        userID: log.userId.userID
      } : null,
      ip: log.ip,
      event: log.event,
      timestamp: log.timestamp,
      formattedDate: new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      severity: getSeverityLevel(log.event)
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error searching logs by user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search logs'
    });
  }
});

// Clear old logs (older than 90 days)
router.delete('/logs/cleanup', authenticateAdmin, async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
      severity: { $ne: 'high' } // Keep high severity logs
    });

    // Log the cleanup
    await AuditLog.create({
      event: 'SYSTEM_EVENT',
      details: {
        description: `Cleaned up ${result.deletedCount} audit logs older than 90 days`,
        action: 'logs_cleanup'
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} audit logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up logs'
    });
  }
});

// Get recent security events (high severity)
router.get('/logs/security', authenticateAdmin, async (req, res) => {
  try {
    const securityEvents = ['CHEATING_DETECTED', 'SECURITY_VIOLATION', 'MULTIPLE_ACCOUNTS', 'LOGIN_FAILED'];
    
    const logs = await AuditLog.find({
      event: { $in: securityEvents },
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
    .populate('userId', 'firstName lastName email userID')
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();

    const formattedLogs = logs.map(log => ({
      id: log._id,
      userId: log.userId ? {
        _id: log.userId._id,
        name: `${log.userId.firstName} ${log.userId.lastName}`,
        email: log.userId.email,
        userID: log.userId.userID
      } : null,
      ip: log.ip,
      event: log.event,
      details: log.details,
      timestamp: log.timestamp,
      formattedDate: new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      severity: getSeverityLevel(log.event)
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security logs'
    });
  }
});

// Get user activity timeline
router.get('/logs/user/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;

    const logs = await AuditLog.find({ userId })
      .populate('userId', 'firstName lastName email userID')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    const formattedLogs = logs.map(log => ({
      id: log._id,
      event: log.event,
      details: log.details,
      timestamp: log.timestamp,
      formattedDate: new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      severity: getSeverityLevel(log.event),
      ip: log.ip
    }));

    res.json({
      success: true,
      logs: formattedLogs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching user activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity logs'
    });
  }
});

// Export logs (CSV format)
router.get('/logs/export', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate, event, format = 'csv' } = req.query;
    
    const filter = {};
    if (startDate) filter.timestamp = { $gte: new Date(startDate) };
    if (endDate) filter.timestamp = { ...filter.timestamp, $lte: new Date(endDate) };
    if (event) filter.event = event;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstName lastName email userID')
      .sort({ timestamp: -1 })
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const csvData = logs.map(log => ({
        Timestamp: new Date(log.timestamp).toISOString(),
        Event: log.event,
        Severity: getSeverityLevel(log.event),
        User: log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System',
        Email: log.userId ? log.userId.email : '',
        UserID: log.userId ? log.userId.userID : '',
        IP: log.ip || '',
        Details: JSON.stringify(log.details || {})
      }));

      const csvHeaders = Object.keys(csvData[0] || {});
      const csvRows = csvData.map(row => 
        csvHeaders.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      return res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        logs: logs.map(log => ({
          ...log,
          severity: getSeverityLevel(log.event),
          formattedDate: new Date(log.timestamp).toISOString()
        })),
        count: logs.length
      });
    }
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
});

module.exports = router;
