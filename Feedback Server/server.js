require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Initialize Resend
const resend = new Resend(RESEND_API_KEY);

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

// API endpoint for feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, rating, feedback } = req.body;
    
    // Validate required fields
    if (!name || !email || !rating || !feedback) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Save to database
    const newFeedback = new Feedback({ name, email, rating, feedback });
    await newFeedback.save();
    
    // Send confirmation email using Resend
    const { data, error } = await resend.emails.send({
      from: 'WebBurns Tech <onboarding@resend.dev>', // You can verify your domain later
      to: email,
      subject: 'Thank You for Your Feedback - WebBurns Tech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Dear ${name},</h2>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for taking the time to share your feedback with us!</p>
          <p style="font-size: 16px; line-height: 1.6;">We've received your <strong>${rating}-star</strong> rating and the following comments:</p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
            <p style="font-style: italic; margin: 0; color: #555;">"${feedback}"</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Your input is invaluable in helping us improve WebBurns AI. We appreciate your support!</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666;">Best regards,</p>
            <p style="margin: 0; font-weight: bold; color: #333;">The WebBurns Tech Team</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend email error:', error);
      // Don't fail the entire request if email fails, just log it
      // The feedback is already saved to database
    } else {
      console.log('Email sent successfully:', data?.id);
    }
    
    res.status(200).json({ 
      message: 'Feedback submitted successfully',
      emailSent: !error 
    });
    
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get all feedback (optional - for admin purposes)
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ date: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Resend API Key: ${RESEND_API_KEY ? 'Configured' : 'Missing'}`);
});
