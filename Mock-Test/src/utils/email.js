const { sendEmail } = require('../config/resend');

// OTP Email Template
const sendOTPEmail = async (email, firstName, otp) => {
  const subject = 'WebburnsTech Mock Test — Verify your email (OTP)';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .otp-box { background: white; border: 2px solid #2563eb; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WebburnsTech Mock Test</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Your WebburnsTech Mock Test verification code is:</p>
          <div class="otp-box">${otp}</div>
          <p><strong>This code expires in 15 minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          <br>
          <p>Thanks,<br>WebburnsTech Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 WebburnsTech. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(email, subject, html);
};

// Verification Pending Email
const sendVerificationPendingEmail = async (email, firstName) => {
  const subject = 'WebburnsTech — Application received';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Application Received</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>We have received your application and are verifying it.</p>
          <div class="info-box">
            <strong>What happens next?</strong>
            <ul>
              <li>Your application will be reviewed by our admin team</li>
              <li>If <strong>accepted</strong>, exam credentials will be sent on <strong>30 Nov 2025, 2 hours before the exam start time (14:00 IST)</strong></li>
              <li>If <strong>rejected</strong>, you will receive a rejection email with resources</li>
            </ul>
          </div>
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: 30-11-2025</li>
            <li>Time: 16:00 - 18:00 IST (2 hours)</li>
            <li>Questions: 75 MCQs (225 marks)</li>
          </ul>
          <br>
          <p>Thanks,<br>WebburnsTech Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 WebburnsTech. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(email, subject, html);
};

// Exam Credentials Email
const sendCredentialsEmail = async (email, firstName, password) => {
  const subject = 'WebburnsTech — Exam credentials';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .credentials { background: white; border: 2px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Application ACCEPTED!</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Congratulations! Your application has been <strong>ACCEPTED</strong>.</p>
          
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: <strong>30-11-2025</strong></li>
            <li>Time: <strong>16:00 - 18:00 IST</strong></li>
            <li>Duration: 2 hours</li>
            <li>Questions: 75 MCQs (225 marks)</li>
          </ul>

          <div class="credentials">
            <h3 style="margin-top: 0;">Your Exam Credentials (single-use):</h3>
            <p><strong>Username:</strong> ${email}</p>
            <p><strong>Password:</strong> <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${password}</code></p>
          </div>

          <div class="warning-box">
            <strong>⚠️ Important Instructions:</strong>
            <ul>
              <li>You can login starting at <strong>14:00 IST</strong> on exam day</li>
              <li>Exam will only run <strong>16:00 - 18:00 IST</strong> strictly</li>
              <li><strong>Do NOT switch tabs/windows</strong> during the exam</li>
              <li><strong>Do NOT copy, paste, or use external resources</strong></li>
              <li>Any suspicious activity can lead to <strong>auto-submission and disqualification</strong></li>
              <li>You will receive <strong>3 warnings</strong> maximum before auto-submit</li>
            </ul>
          </div>

          <p>Good luck with your exam!</p>
          <br>
          <p>Best regards,<br>WebburnsTech Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 WebburnsTech. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(email, subject, html);
};

// Rejection Email
const sendRejectionEmail = async (email, firstName) => {
  const subject = 'WebburnsTech — Application update';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .resources { background: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Thank you for your interest in the WebburnsTech Mock Test.</p>
          <p>After careful review, we regret to inform you that your application cannot be processed at this time. This decision may be due to incomplete information, eligibility criteria, or capacity constraints.</p>
          
          <div class="resources">
            <h3>Resources for you:</h3>
            <ul>
              <li>Practice coding on platforms like LeetCode, HackerRank, CodeChef</li>
              <li>Explore free courses on Coursera, edX, and Udemy</li>
              <li>Join developer communities on GitHub, Stack Overflow</li>
              <li>Stay updated with WebburnsTech for future opportunities</li>
            </ul>
          </div>

          <p>We encourage you to continue your learning journey and apply again in future mock tests.</p>
          <br>
          <p>Best wishes,<br>WebburnsTech Team</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 WebburnsTech. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(email, subject, html);
};

// Contact Form Admin Notification
const sendContactNotification = async (name, email, message, priority) => {
  const subject = `[${priority.toUpperCase()}] New Contact Form Submission - WebburnsTech`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .priority-high { border-left: 4px solid #ef4444; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-low { border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Form Submission</h1>
        </div>
        <div class="content priority-${priority}">
          <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 5px;">${message}</p>
          <p><em>Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(process.env.ADMIN_EMAIL, subject, html);
};

module.exports = {
  sendOTPEmail,
  sendVerificationPendingEmail,
  sendCredentialsEmail,
  sendRejectionEmail,
  sendContactNotification,
};
