const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Audit = require('../models/Audit');
const { sendContactNotification } = require('../utils/email');
const { getClientIP } = require('../middleware/auth');
const { validate, contactSchema } = require('../middleware/validation');
const { contactLimiter } = require('../middleware/rateLimit');

// POST /api/contact - Submit contact form
router.post('/', contactLimiter, validate(contactSchema), async (req, res) => {
  try {
    const { name, email, message, priority } = req.validatedData;
    const ip = getClientIP(req);
    
    // Save to database
    const contact = new Contact({
      name,
      email,
      message,
      priority: priority || 'medium',
    });
    
    await contact.save();
    
    // Send notification email to admin
    try {
      await sendContactNotification(name, email, message, contact.priority);
    } catch (emailError) {
      console.error('Failed to send contact notification:', emailError);
      // Don't fail the request if email fails
    }
    
    // Log audit event
    await Audit.log(null, 'contact_form_submitted', {
      name,
      email,
      priority: contact.priority,
      ip,
    }, ip);
    
    res.json({
      success: true,
      message: 'Thank you for contacting us. We will get back to you soon.',
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact form. Please try again.',
    });
  }
});

module.exports = router;
