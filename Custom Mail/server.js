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
    const { email, password, companyName } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, companyName });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, email: user.email, companyName: user.companyName } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
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
    const companyName = req.user.companyName || 'WebburnsTech';
    
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `You are a professional email writer for ${companyName}. Write clear, concise, and professional business emails. Always maintain a friendly yet professional tone. Structure emails with proper greeting, well-organized body paragraphs, and appropriate closing.`
          },
          {
            role: 'user',
            content: `Write a professional business email for the following request: "${prompt}"

Provide the response in this exact JSON format:
{
  "subject": "Clear and specific subject line",
  "body": "Complete email body with proper paragraphs. Start with a professional greeting like 'Dear [Recipient]' or 'Hello'. Include 2-3 well-structured paragraphs. End with a call to action if appropriate.",
  "signature": "Best regards,\n${companyName}"
}

Important guidelines:
- Use professional language throughout
- Keep paragraphs concise and focused
- Include specific details from the request
- Maintain a warm but professional tone
- Make it ready to send without placeholders (except [Recipient] for the greeting)`
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
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
      // Extract JSON from possible markdown code blocks
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      const emailData = JSON.parse(jsonStr.trim());
      res.json(emailData);
    } catch (parseError) {
      // If JSON parsing fails, extract subject and body from text
      const subjectMatch = aiResponse.match(/Subject[:\s]+([^\n]+)/i);
      const bodyMatch = aiResponse.match(/(?:Body|Content)[:\s]+([\s\S]*?)(?:Signature|Best regards|Sincerely|$)/i);
      
      res.json({
        subject: subjectMatch ? subjectMatch[1].trim() : `Regarding: ${prompt.substring(0, 50)}`,
        body: bodyMatch ? bodyMatch[1].trim() : `Dear Recipient,\n\nThank you for reaching out. ${prompt}\n\nPlease don't hesitate to contact us if you have any questions or require further information.`,
        signature: `Best regards,\n${companyName}`
      });
    }
  } catch (error) {
    console.error('AI Generation Error:', error.response?.data || error.message);
    const companyName = req.user.companyName || 'WebburnsTech';
    res.status(500).json({ 
      error: 'Failed to generate email',
      fallback: {
        subject: `Regarding: ${req.body.prompt.substring(0, 50)}`,
        body: `Dear Recipient,\n\nThank you for your time. I am writing to you regarding: ${req.body.prompt}\n\nPlease let me know if you have any questions or would like to discuss this further. I look forward to hearing from you.`,
        signature: `Best regards,\n${companyName}`
      }
    });
  }
});

// Send Email
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { from, to, subject, body } = req.body;
    const companyName = req.user.companyName || 'WebburnsTech';
    
    // Create professional HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
    .email-container { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 24px 30px; }
    .logo { font-size: 22px; font-weight: bold; color: #00ff88; letter-spacing: 0.5px; }
    .content { padding: 30px; background-color: #ffffff; }
    .content p { margin: 0 0 16px 0; color: #333333; }
    .footer { background-color: #1a1a1a; padding: 28px 30px; text-align: center; }
    .footer p { margin: 0 0 12px 0; font-size: 12px; color: #999999; line-height: 1.6; }
    .footer p:last-child { margin-bottom: 0; }
    .footer a { color: #00ff88; text-decoration: none; }
    .footer-links { margin: 16px 0; padding: 12px 0; border-top: 1px solid #333333; border-bottom: 1px solid #333333; }
    .footer-links a { margin: 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer-brand { font-size: 11px; color: #666666; margin-top: 8px; }
    .divider { width: 40px; height: 3px; background: #00ff88; margin: 0 auto 16px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">${companyName}</div>
    </div>
    <div class="content">
      ${body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('')}
    </div>
    <div class="footer">
      <div class="divider"></div>
      <p>This email was sent by <strong>${companyName}</strong> via Webburns AI Mailer</p>
      <p>Please <strong>do not reply</strong> to this email. For assistance, contact us at <a href="mailto:help@webburnstech.dev">help@webburnstech.dev</a></p>
      <div class="footer-links">
        <a href="mailto:unsubscribe@webburnstech.dev?subject=Unsubscribe%20Request&body=Please%20unsubscribe%20me%20from%20your%20mailing%20list.">Unsubscribe</a>
        <a href="https://www.webburnstech.dev/privacy-policy.html" target="_blank">Privacy Policy</a>
        <a href="https://www.webburnstech.dev/terms-of-service.html" target="_blank">Terms of Service</a>
        <a href="https://www.webburnstech.dev" target="_blank">www.webburnstech.dev</a>
      </div>
      <p class="footer-brand">2025 &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.<br>2023 &reg; WebburnsTech</p>
    </div>
  </div>
</body>
</html>`;

    const emailData = {
      from: from || process.env.DEFAULT_FROM_EMAIL,
      to,
      subject,
      html: htmlBody
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

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'WebburnsTech Mail API',
        version: '2.30.21',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
