/**
 * Webburns Learn Backend Server
 * Handles feedback submissions, sends confirmation emails via Resend, and stores in MongoDB
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, required: true, enum: ['content', 'ui', 'feature', 'bug', 'topic', 'other'] },
    rating: { type: Number, required: true, min: 1, max: 5 },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    submittedAt: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
    ipAddress: { type: String }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Email Template
const generateEmailHTML = (name, rating, category, subject) => {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const categoryLabels = {
        content: 'Content Quality',
        ui: 'User Interface',
        feature: 'Feature Request',
        bug: 'Bug Report',
        topic: 'New Topic Suggestion',
        other: 'Other'
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a0f;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #12121a 0%, #1a1a2e 100%); border-radius: 16px; border: 1px solid rgba(0, 212, 255, 0.3); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1));">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #00d4ff, #a855f7); border-radius: 14px; display: inline-block; margin-bottom: 20px;">
                                <span style="font-size: 28px; line-height: 60px;">🧠</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                <span style="background: linear-gradient(90deg, #00d4ff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                    Thank You for Your Feedback!
                                </span>
                            </h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hi <strong style="color: #00d4ff;">${name}</strong>,
                            </p>
                            <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                We've received your feedback and truly appreciate you taking the time to share your thoughts with us. Your input helps us make Webburns Learn even better!
                            </p>
                            
                            <!-- Feedback Summary Box -->
                            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                                <h3 style="color: #a855f7; margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Feedback Summary</h3>
                                <table width="100%" style="color: #9ca3af; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong style="color: #e5e7eb;">Category:</strong></td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">${categoryLabels[category]}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong style="color: #e5e7eb;">Rating:</strong></td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right; color: #fbbf24; font-size: 16px;">${stars}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;"><strong style="color: #e5e7eb;">Subject:</strong></td>
                                        <td style="padding: 8px 0; text-align: right;">${subject}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                                Our team reviews every piece of feedback. If your submission requires a follow-up, we'll reach out to you at this email address.
                            </p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://learn.webburnstec.dev" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00d4ff, #a855f7); color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 12px; font-size: 16px;">
                                    Continue Learning →
                                </a>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                                This email was sent by <strong style="color: #00d4ff;">Webburns Learn</strong><br>
                                A WebburnsTech Platform<br><br>
                                <a href="https://webburnstec.dev" style="color: #a855f7; text-decoration: none;">webburnstec.dev</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

// API Routes

// Submit Feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const { name, email, category, rating, subject, message } = req.body;

        // Validation
        if (!name || !email || !category || !rating || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Get IP address
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Save to MongoDB
        const feedback = new Feedback({
            name,
            email,
            category,
            rating: parseInt(rating),
            subject,
            message,
            ipAddress
        });

        await feedback.save();
        console.log(`✅ Feedback saved from ${name} (${email})`);

        // Send confirmation email via Resend
        try {
            const emailResult = await resend.emails.send({
                from: process.env.FROM_EMAIL || 'learn@webburnstech.dev',
                to: email,
                subject: '✨ Thank You for Your Feedback - Webburns Learn',
                html: generateEmailHTML(name, parseInt(rating), category, subject)
            });

            // Update feedback with email sent status
            feedback.emailSent = true;
            await feedback.save();

            console.log(`📧 Confirmation email sent to ${email}`, emailResult);
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: feedback._id
        });

    } catch (error) {
        console.error('❌ Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback. Please try again.' });
    }
});

// Get all feedback (admin endpoint - add authentication in production)
app.get('/api/feedback', async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ submittedAt: -1 }).limit(100);
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve feedback.html for /feedback route
app.get('/feedback', (req, res) => {
    res.sendFile(path.join(__dirname, 'feedback.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🧠 Webburns Learn Backend Server                    ║
║   ──────────────────────────────────────────────      ║
║   Server running on: http://localhost:${PORT}            ║
║   Feedback API:      http://localhost:${PORT}/api/feedback║
║   Health Check:      http://localhost:${PORT}/api/health  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
