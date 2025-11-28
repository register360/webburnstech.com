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

    const contact = new Contact(value);
    await contact.save();

    // Send email to admin
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
