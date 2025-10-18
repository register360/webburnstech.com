require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// MongoDB connection
mongoose.connect('mongodb+srv://vinay:vinay1234567@cluster0.uxcfxxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Feedback schema
const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  rating: Number,
  feedback: String,
  date: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // e.g., smtp.gmail.com
  port: 587, // Use 587 for TLS, 465 for SSL
  secure: false, // true for 465, false for other ports
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 60000,
  socketTimeout: 60000
});

// API endpoint for feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, rating, feedback } = req.body;
    
    // Save to database
    const newFeedback = new Feedback({ name, email, rating, feedback });
    await newFeedback.save();
    
    // Send confirmation email
    const mailOptions = {
      from: `WebBurns Tech <${GMAIL_USER}>`,
      to: email,
      subject: 'Thank You for Your Feedback',
      html: `
        <h2>Dear ${name},</h2>
        <p>Thank you for taking the time to share your feedback with us!</p>
        <p>We've received your ${rating}-star rating and the following comments:</p>
        <blockquote>${feedback}</blockquote>
        <p>Your input helps us improve WebBurns AI. We appreciate your support!</p>
        <p>Best regards,</p>
        <p><strong>The WebBurns Tech Team</strong></p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
