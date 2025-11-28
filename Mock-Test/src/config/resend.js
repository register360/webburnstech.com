const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`✅ Email sent to ${to}:`, data.id);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

module.exports = { resend, sendEmail };
