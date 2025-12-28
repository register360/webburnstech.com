const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://webburnstech.dev', 'https://www.webburnstech.dev'],
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/webburns_booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// MongoDB Schema
const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  consultationType: {
    type: String,
    required: true,
    enum: ['free', 'paid', 'enterprise']
  },
  projectDetails: {
    type: String,
    trim: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  confirmationSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

// Email Templates
const emailTemplates = {
  confirmation: {
    subject: 'Consultation Booking Confirmation - WebburnsTech',
    html: (booking) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6c63ff, #00d4ff); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Consultation Confirmed!</h1>
            <p>WebburnsTech</p>
          </div>
          <div class="content">
            <p>Dear ${booking.name},</p>
            <p>Thank you for booking a consultation with WebburnsTech. Your session has been confirmed.</p>
            
            <div class="details">
              <h3>Booking Details:</h3>
              <p><strong>Type:</strong> ${booking.consultationType === 'free' ? 'Free Strategy Call' : booking.consultationType === 'paid' ? 'Paid Consultation' : 'Enterprise Planning'}</p>
              <p><strong>Date & Time:</strong> ${new Date(booking.scheduledTime).toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</p>
              <p><strong>Duration:</strong> ${booking.consultationType === 'enterprise' ? '90 minutes' : booking.consultationType === 'paid' ? '60 minutes' : '30 minutes'}</p>
              ${booking.company ? `<p><strong>Company:</strong> ${booking.company}</p>` : ''}
            </div>
            
            <p><strong>Meeting Link:</strong> <a href="https://meet.google.com/jyt-eksb-xmu">Join Google Meet</a></p>
            
            <p><strong>Preparation:</strong></p>
            <ul>
              <li>Please be ready to discuss your project requirements</li>
              <li>Have any existing materials or links ready to share</li>
              <li>Think about your goals and budget considerations</li>
            </ul>
            
            <p>Need to reschedule? Contact us at <a href="mailto:consultation@webburnstech.dev">consultation@webburnstech.dev</a></p>
            
            <div class="footer">
              <p>Best regards,<br>The WebburnsTech Team</p>
              <p><a href="https://webburnstech.dev">webburnstech.dev</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  reminder: {
    subject: 'Reminder: Your Consultation with WebburnsTech',
    html: (booking) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6c63ff, #00d4ff); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #6c63ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Consultation Reminder</h1>
            <p>WebburnsTech</p>
          </div>
          <div class="content">
            <p>Dear ${booking.name},</p>
            <p>This is a friendly reminder about your upcoming consultation with WebburnsTech.</p>
            
            <div class="details">
              <h3>Session Details:</h3>
              <p><strong>Starts in:</strong> 30 minutes</p>
              <p><strong>Time:</strong> ${new Date(booking.scheduledTime).toLocaleString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</p>
              <p><strong>Type:</strong> ${booking.consultationType === 'free' ? 'Free Strategy Call' : booking.consultationType === 'paid' ? 'Paid Consultation' : 'Enterprise Planning'}</p>
            </div>
            
            <p><strong>Meeting Link:</strong> <a href="https://meet.google.com/jyt-eksb-xmu>Join Google Meet</a></p>
            
            <p>Looking forward to our conversation!</p>
            
            <div class="footer">
              <p>Best regards,<br>The WebburnsTech Team</p>
              <p><a href="https://webburnstech.dev">webburnstech.dev</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  adminNotification: {
    subject: 'New Consultation Booking',
    html: (booking) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16213e, #1a1a2e); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6c63ff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Alert</h1>
            <p>WebburnsTech Consultation System</p>
          </div>
          <div class="content">
            <h2>A new consultation has been booked:</h2>
            
            <div class="details">
              <h3>Client Information:</h3>
              <p><strong>Name:</strong> ${booking.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${booking.email}">${booking.email}</a></p>
              ${booking.phone ? `<p><strong>Phone:</strong> ${booking.phone}</p>` : ''}
              ${booking.company ? `<p><strong>Company:</strong> ${booking.company}</p>` : ''}
              
              <h3>Consultation Details:</h3>
              <p><strong>Type:</strong> ${booking.consultationType === 'free' ? 'Free Strategy Call' : booking.consultationType === 'paid' ? 'Paid Consultation' : 'Enterprise Planning'}</p>
              <p><strong>Scheduled Time:</strong> ${new Date(booking.scheduledTime).toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</p>
              <p><strong>Duration:</strong> ${booking.consultationType === 'enterprise' ? '90 minutes' : booking.consultationType === 'paid' ? '60 minutes' : '30 minutes'}</p>
              
              ${booking.projectDetails ? `
                <h3>Project Details:</h3>
                <p>${booking.projectDetails}</p>
              ` : ''}
            </div>
            
            <p><strong>Client Timezone:</strong> ${booking.timezone}</p>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            
            <p>Please prepare for this consultation and add it to your calendar.</p>
            
            <div class="footer">
              <p>This is an automated notification from WebburnsTech Booking System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Email sending function
async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'WebburnsTech <notifications@webburnstech.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    console.log('Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Booking API Endpoint
app.post('/api/book-consultation', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      consultationType,
      projectDetails,
      scheduledTime,
      timezone = 'UTC'
    } = req.body;

    // Validate required fields
    if (!name || !email || !consultationType || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, consultationType, scheduledTime'
      });
    }

    // Validate consultation type
    if (!['free', 'paid', 'enterprise'].includes(consultationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultation type'
      });
    }

    // Parse scheduled time
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for scheduledTime'
      });
    }

    // Check if time is in the future
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    // Create new booking
    const booking = new Booking({
      name,
      email,
      phone,
      company,
      consultationType,
      projectDetails,
      scheduledTime: scheduledDate,
      timezone,
      status: 'pending'
    });

    // Save to database
    await booking.save();

    // Send confirmation email to client
    const clientEmailSent = await sendEmail(
      email,
      emailTemplates.confirmation.subject,
      emailTemplates.confirmation.html(booking)
    );

    // Send notification to admin
    const adminEmailSent = await sendEmail(
      'consultation@webburnstech.dev',
      emailTemplates.adminNotification.subject,
      emailTemplates.adminNotification.html(booking)
    );

    // Send notification to reminder email as well
    await sendEmail(
      'reminder@webburnstech.dev',
      emailTemplates.adminNotification.subject,
      emailTemplates.adminNotification.html(booking)
    );

    // Update booking with email status
    booking.confirmationSent = clientEmailSent;
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Consultation booked successfully! Check your email for confirmation.',
      data: {
        bookingId: booking._id,
        scheduledTime: booking.scheduledTime,
        consultationType: booking.consultationType,
        emailsSent: {
          client: clientEmailSent,
          admin: adminEmailSent
        }
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    
    // Check for duplicate booking
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A booking already exists for this time slot'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error booking consultation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get bookings (admin endpoint - add authentication in production)
app.get('/api/bookings', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.scheduledTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ scheduledTime: 1 })
      .select('-__v');

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// Update booking status
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Function to send reminder emails
async function sendReminderEmails() {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

    // Find bookings happening in 30 minutes that haven't had reminders sent
    const upcomingBookings = await Booking.find({
      scheduledTime: {
        $gte: reminderTime,
        $lt: new Date(reminderTime.getTime() + 60000) // Within 1 minute window
      },
      reminderSent: false,
      status: { $in: ['pending', 'confirmed'] }
    });

    console.log(`Found ${upcomingBookings.length} bookings for reminders`);

    for (const booking of upcomingBookings) {
      // Send reminder to client
      const clientReminderSent = await sendEmail(
        booking.email,
        emailTemplates.reminder.subject,
        emailTemplates.reminder.html(booking)
      );

      // Send reminder to admin team
      const adminReminderSent = await sendEmail(
        ['consultation@webburnstech.dev', 'reminder@webburnstech.dev'],
        `Reminder: Consultation with ${booking.name} in 30 minutes`,
        emailTemplates.adminNotification.html(booking)
      );

      if (clientReminderSent || adminReminderSent) {
        booking.reminderSent = true;
        await booking.save();
        console.log(`Reminders sent for booking: ${booking._id}`);
      }
    }
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

// Schedule reminder emails to run every minute
cron.schedule('* * * * *', () => {
  console.log('Checking for upcoming consultations...');
  sendReminderEmails();
});

// Clean up old completed/cancelled bookings (runs daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Booking.deleteMany({
      status: { $in: ['completed', 'cancelled'] },
      scheduledTime: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old bookings`);
  } catch (error) {
    console.error('Error cleaning up old bookings:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log('Reminder system is active and checking every minute');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...');
  mongoose.connection.close();
  process.exit(0);
});
