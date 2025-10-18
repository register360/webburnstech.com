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
    
    // Send confirmation email using Resend with your verified domain
    const { data, error } = await resend.emails.send({
      from: 'WebburnsTech <noreply@webburnstech.dev>', // Using your verified domain
      to: email,
      replyTo: 'contact@webburnstech.dev', // Optional: for replies
      subject: 'Thank You for Your Feedback - WebBurns AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">WebBurns AI</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Innovation & Development</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Dear ${name},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Thank you for taking the time to share your valuable feedback with us!
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Your Feedback Summary:</h3>
              <p style="margin: 10px 0;"><strong>Rating:</strong> 
                <span style="color: #ffc107;">
                  ${'★'.repeat(rating)}${'☆'.repeat(5-rating)} 
                  (${rating}/5)
                </span>
              </p>
              <p style="margin: 10px 0;"><strong>Comments:</strong></p>
              <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">
                <p style="font-style: italic; margin: 0; color: #666;">"${feedback}"</p>
              </div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Your input is invaluable in helping us improve WebBurns AI and deliver better 
              solutions. We're committed to using your feedback to enhance our services.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              We appreciate your support and look forward to serving you better!
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Best regards,<br>
              <strong style="color: #333;">The WebubrnsTechTeam</strong>
              <strong style="color: #333;">WebBurns AI</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              <a href="https://webburnstech.dev" style="color: #667eea; text-decoration: none;">webburnstech.dev</a> | 
              <a href="mailto:contact@webburnstech.dev" style="color: #667eea; text-decoration: none;">contact@webburnstech.dev</a>
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend email error:', error);
      // Don't fail the entire request if email fails
      console.log('Feedback saved to DB but email failed');
    } else {
      console.log('Email sent successfully via Resend. Email ID:', data?.id);
    }
    
    res.status(200).json({ 
      message: 'Feedback submitted successfully',
      emailSent: !error,
      feedbackId: newFeedback._id
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
    domain: 'webburnstech.dev',
    timestamp: new Date().toISOString()
  });
});

// Get all feedback (for admin purposes)
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ date: -1 });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback by ID
app.get('/api/feedback/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Resend API Key: ${RESEND_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Domain: webburnstech.dev (Verified)`);
});
