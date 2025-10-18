const express = require('express');
const bodyParser = require('body-parser');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/submit-form', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields'
      });
    }

    // 1. Send email to admin
    const adminEmail = await resend.emails.send({
      from: 'WebburnsTech Contact <contact@webburnstech.dev>',
      to: 'webburnstech@gmail.com', // Or your admin email
      subject: `📧 New Contact: ${subject || 'General Inquiry'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700;">New Contact Form Submission</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Website Contact Form</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h2 style="color: white; margin: 0; font-size: 24px;">🚀 New Lead Alert</h2>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase;">Name</h3>
                  <p style="margin: 0; color: #667eea; font-size: 18px; font-weight: 600;">${name}</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #764ba2;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase;">Email</h3>
                  <p style="margin: 0; color: #764ba2; font-size: 16px; font-weight: 600;">
                    <a href="mailto:${email}" style="color: #764ba2; text-decoration: none;">${email}</a>
                  </p>
                </div>
              </div>
              
              ${subject ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f093fb;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase;">Subject</h3>
                <p style="margin: 0; color: #f5576c; font-size: 16px; font-weight: 600;">${subject}</p>
              </div>
              ` : ''}
              
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffeaa7;">
                <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px;">📝 Message Content</h3>
                <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #fbc02d;">
                  <p style="margin: 0; color: #555; line-height: 1.6; white-space: pre-line;">${message}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: white; font-weight: 600;">⏰ Please respond within 24 hours</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #2c3e50; padding: 30px; text-align: center; color: white;">
              <p style="margin: 0 0 10px 0; font-size: 14px;">WebburnsTech Contact Management System</p>
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">Automated Notification • ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // 2. Send confirmation email to user
    const userEmail = await resend.emails.send({
      from: 'WebburnsTech Support <support@webburnstech.dev>',
      to: email,
      replyTo: 'support@webburnstech.dev',
      subject: 'Thank You for Contacting WebburnsTech!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank You - WebburnsTech</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.15);">
            <!-- Header with Gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center; color: white; position: relative;">
              <div style="position: absolute; top: 20px; right: 30px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">AUTO-CONFIRMATION</div>
              <h1 style="margin: 0; font-size: 36px; font-weight: 300; letter-spacing: -0.5px;">Thank You, ${name}!</h1>
              <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">We've received your message</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 50px 40px;">
              <!-- Confirmation Icon -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(79, 172, 254, 0.3);">
                  <span style="color: white; font-size: 36px;">✓</span>
                </div>
              </div>
              
              <!-- Message -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 28px; font-weight: 600;">Message Received Successfully</h2>
                <p style="color: #7f8c8d; font-size: 16px; line-height: 1.6; margin: 0;">
                  Thank you for reaching out to WebburnsTech. We appreciate you taking the time to contact us and will respond to your inquiry shortly.
                </p>
              </div>
              
              <!-- Submission Details -->
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                <h3 style="color: white; margin: 0 0 20px 0; font-size: 20px; text-align: center;">📋 Submission Summary</h3>
                <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px;">
                  <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 15px;">
                    <strong style="color: white; text-align: right;">Name:</strong>
                    <span style="color: white;">${name}</span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 15px;">
                    <strong style="color: white; text-align: right;">Email:</strong>
                    <span style="color: white;">${email}</span>
                  </div>
                  ${subject ? `
                  <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px; margin-bottom: 15px;">
                    <strong style="color: white; text-align: right;">Subject:</strong>
                    <span style="color: white;">${subject}</span>
                  </div>
                  ` : ''}
                  <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 15px;">
                    <strong style="color: white; text-align: right;">Submitted:</strong>
                    <span style="color: white;">${new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <!-- Next Steps -->
              <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 5px solid #4facfe;">
                <h4 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">🔄 What Happens Next?</h4>
                <ul style="color: #7f8c8d; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Our team will review your message within 24 hours</li>
                  <li>You'll receive a personalized response from our experts</li>
                  <li>We'll work with you to understand and address your needs</li>
                </ul>
              </div>
              
              <!-- Urgent Notice -->
              <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <p style="margin: 0; color: #d63031; font-weight: 600; font-size: 14px;">
                  ⚡ For urgent inquiries, please email us directly at 
                  <a href="mailto:support@webburnstech.dev" style="color: #d63031; text-decoration: underline;">support@webburnstech.dev</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #2c3e50; padding: 40px 30px; text-align: center; color: white;">
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 300;">WebburnsTech</h3>
                <p style="margin: 0; opacity: 0.8; font-size: 14px;">AI Innovation & Technology Solutions</p>
              </div>
              <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
                <a href="https://webburnstech.dev" style="color: #4facfe; text-decoration: none; font-size: 14px;">Website</a>
                <a href="mailto:contact@webburnstech.dev" style="color: #4facfe; text-decoration: none; font-size: 14px;">Contact</a>
                <a href="https://webburnstech.dev/support" style="color: #4facfe; text-decoration: none; font-size: 14px;">Support</a>
              </div>
              <p style="margin: 0; font-size: 12px; opacity: 0.6;">
                This is an automated confirmation email. Please do not reply to this message.<br>
                &copy; ${new Date().getFullYear()} WebburnsTech. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // Check if both emails were sent successfully
    if (adminEmail.error || userEmail.error) {
      console.error('Email sending errors:', { admin: adminEmail.error, user: userEmail.error });
      throw new Error('Failed to send one or more emails');
    }

    res.json({
      success: true,
      message: 'Message sent successfully! A confirmation has been sent to your email.',
      emailIds: {
        admin: adminEmail.data?.id,
        user: userEmail.data?.id
      }
    });

  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again or contact us directly.',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Contact server is running',
    timestamp: new Date().toISOString(),
    service: 'WebburnsTech Contact Form'
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Contact server running on port ${PORT}`);
  console.log('Resend API configured with domain: webburnstech.dev');
});
