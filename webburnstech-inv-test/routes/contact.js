const express = require('express');
const Contact = require('../models/Contact');
const { sendEmail } = require('../utils/emailService');
const router = express.Router();

const Joi = require('joi');

const contactSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').required(),
  subject: Joi.string().trim().min(1).max(100).required(),
  message: Joi.string().trim().min(20).max(1000).required()
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = contactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Save to DB
    const contact = new Contact(value);
    await contact.save();

    /* -----------------------------------
       1️⃣ Email sent to ADMIN
    ------------------------------------ */
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'webburnstech@gmail.com',
      subject: `Contact Form: ${value.priority.toUpperCase()} - ${value.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${value.firstName} ${value.lastName}</p>
        <p><strong>Email:</strong> ${value.email}</p>
        <p><strong>Phone:</strong> ${value.phone || 'Not provided'}</p>
        <p><strong>Priority:</strong> ${value.priority}</p>
        <p><strong>Subject:</strong> ${value.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${value.message}</p>
      `
    });

    /* -----------------------------------
       2️⃣ Auto-reply email to the USER
    ------------------------------------ */
    await sendEmail({
      to: value.email,
      subject: `We received your message - WebburnsTech Support`,
      html: `
        <h2>Thank you for contacting WebburnsTech</h2>
        <p>Hi ${value.firstName},</p>
        <p>We have received your message and our support team will respond based on your priority level:</p>
        
        <ul>
           <li><strong>Low:</strong> 48 hours</li>
           <li><strong>Medium:</strong> 24 hours</li>
           <li><strong>High:</strong> 6 hours</li>
        </ul>

        <h3>Your Message:</h3>
        <p><strong>Subject:</strong> ${value.subject}</p>
        <p>${value.message}</p>

        <br>
        <p>Regards,<br>WebburnsTech Support Team</p>
      `
    });

    res.json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

module.exports = router;
