const express = require('express');
const { Resend } = require('resend');
const Contact = require('../models/Contact');
const { logger } = require('../../server');
const { validateContact } = require('../middleware/validation');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Contact form submission
router.post('/', validateContact, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      priority,
      subject,
      message
    } = req.body;

    // Create contact record
    const contact = new Contact({
      firstName,
      lastName,
      email,
      phone: phone || '',
      priority,
      subject,
      message,
      createdAt: new Date()
    });

    await contact.save();

    // Send email notification to admin
    await sendAdminNotification(contact);

    // Send auto-reply to user
    await sendAutoReply(contact);

    logger.info(`New contact form submission from: ${email}`);

    res.json({
      success: true,
      message: 'Your message has been sent successfully',
      contactId: contact._id
    });

  } catch (error) {
    logger.error('Contact form submission error:', error);
    res.status(500).json({
      error: 'Internal server error. Please try again later.'
    });
  }
});

// Get contact submissions (admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, priority, status } = req.query;

    const filter = {};
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Contact.countDocuments(filter);

    res.json({
      success: true,
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
async function sendAdminNotification(contact) {
  try {
    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };

    const priorityIcons = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Form: ${contact.subject} - ${contact.priority.toUpperCase()} Priority`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Contact Form Submission</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #1e293b;">${contact.subject}</h3>
              <span style="background-color: ${priorityColors[contact.priority]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                ${priorityIcons[contact.priority]} ${contact.priority.toUpperCase()}
              </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
              <div>
                <strong>Name:</strong><br>
                ${contact.firstName} ${contact.lastName}
              </div>
              <div>
                <strong>Email:</strong><br>
                ${contact.email}
              </div>
              <div>
                <strong>Phone:</strong><br>
                ${contact.phone || 'Not provided'}
              </div>
              <div>
                <strong>Submitted:</strong><br>
                ${new Date(contact.createdAt).toLocaleString()}
              </div>
            </div>
            
            <div>
              <strong>Message:</strong>
              <div style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 5px; border-left: 4px solid ${priorityColors[contact.priority]};">
                ${contact.message.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.ADMIN_URL}/contacts" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Admin Panel
            </a>
          </div>
        </div>
      `
    });

    logger.info(`Admin notification sent for contact: ${contact._id}`);
  } catch (error) {
    logger.error('Failed to send admin notification:', error);
  }
}

async function sendAutoReply(contact) {
  try {
    const responseTimes = {
      low: '48 hours',
      medium: '24 hours',
      high: '6 hours'
    };

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: contact.email,
      subject: 'Thank you for contacting WebburnsTech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank You for Contacting WebburnsTech</h2>
          
          <p>Dear ${contact.firstName},</p>
          
          <p>We have received your message and appreciate you reaching out to us. Here's a summary of your inquiry:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Subject:</strong> ${contact.subject}</p>
            <p><strong>Priority:</strong> ${contact.priority.charAt(0).toUpperCase() + contact.priority.slice(1)}</p>
            <p><strong>Expected Response Time:</strong> Within ${responseTimes[contact.priority]}</p>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our team will review your message</li>
            <li>We'll respond to your inquiry within ${responseTimes[contact.priority]}</li>
            <li>For urgent matters, we may contact you via phone</li>
          </ul>
          
          <p><strong>Reference Number:</strong> CT${contact._id.toString().slice(-8).toUpperCase()}</p>
          
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Emergency Support:</strong> If this is regarding an active exam issue, please call our emergency hotline at +1 (555) 911-TECH.</p>
          </div>
          
          <p>Best regards,<br>
          <strong>WebburnsTech Support Team</strong></p>
        </div>
      `
    });

    logger.info(`Auto-reply sent to: ${contact.email}`);
  } catch (error) {
    logger.error('Failed to send auto-reply:', error);
  }
}

module.exports = router;