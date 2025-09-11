const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (important for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting - 5 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many contact form submissions from this IP, please try again later.'
  }
});
app.use('/api/contact', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio_contact', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Contact schema
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Contact = mongoose.model('Contact', contactSchema);

// Nodemailer transporter - FIXED: createTransporter -> createTransport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const getAdminNotificationTemplate = (contactData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Contact Form Submission</title>
    </head>
    <body>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Contact Form Submission</h2>
        <p>You have received a new message from your portfolio website:</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Name:</strong> ${contactData.name}</p>
          <p><strong>Email:</strong> ${contactData.email}</p>
          <p><strong>Message:</strong></p>
          <p>${contactData.message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="color: #6B7280; font-size: 14px;">This message was sent from your portfolio contact form on ${new Date().toLocaleDateString()}.</p>
      </div>
    </body>
    </html>
  `;
};

const getAutoReplyTemplate = (contactData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank you for contacting me</title>
    </head>
    <body>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Thank you for reaching out!</h2>
        <p>Hello ${contactData.name},</p>
        <p>Thank you for contacting me through my portfolio website. I have received your message and will get back to you as soon as possible.</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Your message:</strong></p>
          <p>${contactData.message.replace(/\n/g, '<br>')}</p>
        </div>
        <p>I typically respond within 24-48 hours. If your inquiry is urgent, you can also reach me directly at ${process.env.PERSONAL_PHONE || '+91 9573512088'}.</p>
        <p>Best regards,<br>Tirukoti Vinay</p>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 12px;">This is an automated response. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Contact form route
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Save to database
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    // Create email transporter
    const transporter = createTransporter();

    // Send notification to admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'vinayvivek070@gmail.com',
      subject: `New Contact Form Submission from ${name}`,
      html: getAdminNotificationTemplate({ name, email, message })
    };

    // Send auto-reply to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Tirukoti Vinay',
      html: getAutoReplyTemplate({ name, email, message })
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! I will get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Different error messages based on error type
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry error'
      });
    }
    
    // Handle email errors specifically
    if (error.responseCode || error.code === 'EAUTH') {
      return res.status(500).json({
        success: false,
        message: 'Email service configuration error. Please contact me directly at vinayvivek070@gmail.com'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
