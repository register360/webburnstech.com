const { sendEmail } = require('./emailService');
const User = require('../models/User');

async function sendExamCredentials() {
  try {
    const acceptedUsers = await User.find({ 
      status: 'accepted', 
      credentialsSentAt: null 
    });

    for (const user of acceptedUsers) {
      const password = Math.random().toString(36).slice(-8);
      
      user.examPassword = password;
      user.credentialsSentAt = new Date();
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'WebburnsTech — Exam credentials',
        html: `
          <h2>WebburnsTech Mock Test - Exam Credentials</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your application has been ACCEPTED.</p>
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: 30th November 2025</li>
            <li>Time: 16:00 – 18:00 IST</li>
          </ul>
          <p><strong>Your exam credentials:</strong></p>
          <p>Username: ${user.email}</p>
          <p>Password: ${password}</p>
          <a herf="https://test.webburnstech.dev/login.html">Start Exam Now</a>
          <p><strong>Important Instructions:</strong></p>
          <ul>
            <li>Login will be available from 14:00 IST</li>
            <li>Exam strictly runs from 16:00–18:00 IST</li>
            <li>Do not switch tabs/windows during exam</li>
            <li>Any suspicious activity may lead to disqualification</li>
          </ul>
          <p>Good luck!</p>
          <p>WebburnsTech Team</p>
        `
      });
    }

    console.log(`Sent credentials to ${acceptedUsers.length} users`);
  } catch (error) {
    console.error('Error sending exam credentials:', error);
  }
}

module.exports = { sendExamCredentials };
