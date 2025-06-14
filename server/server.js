const express = require('express');Add commentMore actions
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

app.post('/submit-form', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // 1. Send email to your admin
    const adminMailOptions = {
      from: `"Website Contact" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Contact: ${subject || 'No Subject'}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    // 2. Send confirmation email to user
    const userMailOptions = {
      from: `"Webburns Tech Support" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Thank you for contacting Webburns Tech',
      html: `
        <h2>Thank you for reaching out, ${name}!</h2>
        <p>We've received your message and our team will get back to you soon.</p>
        <p>Our support team is currently reviewing your request and will get back to you as soon as possible.</p>
        <p>Here's what you submitted:</p>
        <blockquote>
          <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
          <p><strong>Your Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </blockquote>
        <p>Thank you for choosing Webburns Tech. We look forward to assisting you.</p>
        <p>If you have any urgent inquiries, please email us directly at support@webburnstech.com</p>
        <strong><p style="background-color: #fffde7;padding: 15px;border-left: 4px solid #fbc02d;margin: 20px 0;">This is an automated confirmation. A member of our team will reach out shortly.</p></strong>
        <p style="margin-top: 20px;">
      Warm regards,<br>
      <strong>The Webburns Tech Support Team</strong><br>
      <a href="https://www.webburnstech.ct.ws" target="_blank">www.webburnstech.ct.ws</a>
    </p>
      `
    };

    // Send both emails in parallel
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions)
    ]);


    res.json({
      success: true,
      message: 'Message sent successfully! A confirmation has been sent to your email.'
    });


  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
