const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    console.log('Attempting to send email to:', to);
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'WebburnsTech <exam@test.webburnstech.dev>',
      to: [to],
      subject: subject,
      html: html,
      text: text
    });

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

module.exports = { sendEmail };
