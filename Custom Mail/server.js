require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const axios = require('axios');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors({origin:'*'}));
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/email-platform')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyName: String,
  createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

const emailSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from: { type: String, required: true },
  to: [{ type: String, required: true }],
  subject: { type: String, required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed', 'draft'], default: 'sent' },
  sentAt: { type: Date, default: Date.now }
});

const templateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  category: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('MailerUser', userSchema, 'mailer_users');
const Contact  = mongoose.model('MailerContact', contactSchema, 'mailer_contacts');
const Email    = mongoose.model('MailerEmail', emailSchema, 'mailer_emails');
const Template = mongoose.model('MailerTemplate', templateSchema, 'mailer_templates');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);

    const { email, password, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      companyName
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error('REGISTER ERROR FULL:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, email: user.email, companyName: user.companyName } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user info
app.get('/api/user', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// AI Email Generation
app.post('/api/generate-email', authenticate, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'user',
            content: `Generate a professional email based on this request: "${prompt}". 
            Please provide in this exact JSON format:
            {
              "subject": "email subject here",
              "body": "complete email body here with proper formatting",
              "signature": "Best regards,\n[Your Name/Company]"
            }
            Make sure the email is professional, well-structured, and ready to send.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    
    // Try to parse JSON from the response
    try {
      const emailData = JSON.parse(aiResponse);
      res.json(emailData);
    } catch (parseError) {
      // If JSON parsing fails, extract subject and body from text
      const subjectMatch = aiResponse.match(/Subject: (.+?)(\n|$)/i);
      const bodyMatch = aiResponse.match(/(Body:|Content:)([\s\S]*)/i);
      
      res.json({
        subject: subjectMatch ? subjectMatch[1].trim() : 'Generated Email',
        body: bodyMatch ? bodyMatch[2].trim() : aiResponse,
        signature: "Best regards,\n" + (req.user.companyName || 'Your Team')
      });
    }
  } catch (error) {
    console.error('AI Generation Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate email',
      fallback: {
        subject: `Email about ${req.body.prompt}`,
        body: `Dear Recipient,\n\nThis is regarding: ${req.body.prompt}\n\nPlease let me know if you have any questions.`,
        signature: "Best regards,\n" + (req.user.companyName || 'Your Team')
      }
    });
  }
});

// Send Email
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { from, to, subject, body } = req.body;
    
    const emailData = {
      from: from || process.env.DEFAULT_FROM_EMAIL,
      to,
      subject,
      html: body.replace(/\n/g, '<br>')
    };

    const response = await resend.emails.send(emailData);
    
    // Save to database
    const email = new Email({
      userId: req.user._id,
      from: emailData.from,
      to,
      subject,
      body,
      status: 'sent'
    });
    await email.save();

    res.json({ 
      success: true, 
      messageId: response.data.id,
      emailId: email._id 
    });
  } catch (error) {
    console.error('Send Email Error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Contacts CRUD
app.get('/api/contacts', authenticate, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.post('/api/contacts', authenticate, async (req, res) => {
  try {
    const contact = new Contact({ ...req.body, userId: req.user._id });
    await contact.save();
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

app.put('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

app.delete('/api/contacts/:id', authenticate, async (req, res) => {
  try {
    await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Email History
app.get('/api/emails', authenticate, async (req, res) => {
  try {
    const emails = await Email.find({ userId: req.user._id })
      .sort({ sentAt: -1 })
      .limit(50);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Templates CRUD
app.get('/api/templates', authenticate, async (req, res) => {
  try {
    const templates = await Template.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.post('/api/templates', authenticate, async (req, res) => {
  try {
    const template = new Template({ ...req.body, userId: req.user._id });
    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
