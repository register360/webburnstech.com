require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors'); // Add CORS support

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.GMAIL_USER || 'webburnstech@gmail.com', // Use environment variable
    pass: process.env.GMAIL_PASS || 'uqtnttdliphtxhgh' // Use environment variable
  }
});

// Contact form endpoint
app.post('/submit-form', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    const mailOptions = {
      from: `"Website Contact" <${process.env.GMAIL_USER || 'webburnstech@gmail.com'}>`,
      to: process.env.GMAIL_USER || 'webburnstech@gmail.com',
      subject: `New Contact: ${subject || 'No Subject'}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to send email',
          error: error.toString()
        });
      }
      
      console.log('Email sent:', info.response);
      res.json({
        success: true,
        message: 'Message sent successfully!'
      });
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
