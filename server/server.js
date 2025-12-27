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
  <title>New Contact | WebburnsTech</title>
</head>
<body style="margin:0; padding:0; background:#0b0b0b; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b; padding:30px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#121212; border:1px solid #1f1f1f; box-shadow:0 0 40px rgba(0,255,255,0.05);">

          <!-- HEADER -->
          <tr>
            <td style="padding:30px; border-bottom:1px solid #1f1f1f;">
              <h1 style="margin:0; color:#e5e5e5; font-size:26px; letter-spacing:1px;">
                NEW CONTACT RECEIVED
              </h1>
              <p style="margin:8px 0 0; color:#7a7a7a; font-size:13px;">
                WebburnsTech Contact System
              </p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:30px;">

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
                <tr>
                  <td style="color:#8be9fd; font-size:12px; letter-spacing:1px;">NAME</td>
                </tr>
                <tr>
                  <td style="color:#ffffff; font-size:18px; padding-top:4px;">${name}</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
                <tr>
                  <td style="color:#8be9fd; font-size:12px; letter-spacing:1px;">EMAIL</td>
                </tr>
                <tr>
                  <td style="color:#cfd8dc; font-size:16px; padding-top:4px;">
                    <a href="mailto:${email}" style="color:#8be9fd; text-decoration:none;">${email}</a>
                  </td>
                </tr>
              </table>

              ${subject ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:25px;">
                <tr>
                  <td style="color:#8be9fd; font-size:12px; letter-spacing:1px;">SUBJECT</td>
                </tr>
                <tr>
                  <td style="color:#ffffff; font-size:16px; padding-top:4px;">${subject}</td>
                </tr>
              </table>
              ` : ''}

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#8be9fd; font-size:12px; letter-spacing:1px;">MESSAGE</td>
                </tr>
                <tr>
                  <td style="color:#d0d0d0; font-size:15px; line-height:1.7; padding-top:10px; background:#0e0e0e; padding:20px; border-left:3px solid #8be9fd;">
                    ${message}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:25px; border-top:1px solid #1f1f1f; text-align:center;">
              <p style="margin:0; font-size:12px; color:#6b6b6b;">
                WebburnsTech • Automated Internal Notification<br>
                ${new Date().toLocaleString()}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
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
  <title>Message Received | WebburnsTech</title>
</head>
<body style="margin:0; padding:0; background:#0b0b0b; font-family: Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#121212; border:1px solid #1f1f1f; box-shadow:0 0 50px rgba(0,255,255,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="padding:35px; border-bottom:1px solid #1f1f1f;">
              <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:300;">
                MESSAGE RECEIVED
              </h1>
              <p style="margin-top:10px; color:#8be9fd; font-size:14px;">
                Thank you, ${name}
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:35px; color:#d0d0d0; font-size:16px; line-height:1.7;">
              We’ve successfully received your message at <strong style="color:#ffffff;">WebburnsTech</strong>.

              <div style="margin:25px 0; padding:20px; background:#0e0e0e; border-left:3px solid #8be9fd;">
                Our technical team will review your inquiry and respond within <strong>24 hours</strong>.
              </div>

              If your request is urgent, contact us directly at:
              <br><br>
              <a href="mailto:support@webburnstech.dev" style="color:#8be9fd; text-decoration:none;">
                support@webburnstech.dev
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:30px; border-top:1px solid #1f1f1f; text-align:center;">
              <p style="margin:0; font-size:13px; color:#7a7a7a;">
                WebburnsTech — Engineering the Future
              </p>
              <p style="margin-top:10px; font-size:11px; color:#555;">
                This is an automated email. Please do not reply.<br>
                © ${new Date().getFullYear()} WebburnsTech. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
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
