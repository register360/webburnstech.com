import { Resend } from 'resend';
import { logger } from '../../server';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email: string, firstName: string, otp: string) => {
  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: 'WebburnsTech Mock Test - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">WebburnsTech Mock Test</h2>
          <p>Hi ${firstName},</p>
          <p>Your verification code for WebburnsTech Mock Test is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code expires in 15 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <br>
          <p>Best regards,<br>WebburnsTech Team</p>
        </div>
      `
    });

    logger.info(`OTP email sent to: ${email}`);
    return result;
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    throw error;
  }
};

export const sendVerificationPendingEmail = async (email: string, firstName: string) => {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: 'WebburnsTech - Application Received',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">WebburnsTech</h2>
          <p>Hi ${firstName},</p>
          <p>We have received your application and are verifying it. If your application is accepted, exam credentials will be sent on the day of the exam (30 Nov 2025), <strong>2 hours before the exam start time (16:00 IST)</strong>.</p>
          <p>If rejected, you will receive a rejection mail.</p>
          <br>
          <p>Thanks,<br>WebburnsTech Team</p>
        </div>
      `
    });

    logger.info(`Verification pending email sent to: ${email}`);
  } catch (error) {
    logger.error('Error sending verification pending email:', error);
    throw error;
  }
};

export const sendCredentialsEmail = async (user: any) => {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: user.email,
      subject: 'WebburnsTech - Exam Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">WebburnsTech Mock Test</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your application has been <strong>ACCEPTED</strong>.</p>
          <p><strong>Exam Details:</strong></p>
          <ul>
            <li>Date: 30-11-2025</li>
            <li>Time: 16:00–18:00 IST</li>
          </ul>
          <p>Here are your exam credentials:</p>
          <div style="background-color: #f3f4f6; padding: 15px; margin: 15px 0;">
            <p><strong>Username:</strong> ${user.email}</p>
            <p><strong>Password:</strong> ${user.examCredentials.password}</p>
          </div>
          <p><strong>Important Instructions:</strong></p>
          <ul>
            <li>Login will be available from 14:00 IST</li>
            <li>Exam strictly runs from 16:00–18:00 IST</li>
            <li>Do not attempt to change tabs/windows</li>
            <li>Any suspicious activity can lead to auto-submission and disqualification</li>
          </ul>
          <p>Good luck!</p>
          <br>
          <p>Best regards,<br>WebburnsTech Team</p>
        </div>
      `
    });

    logger.info(`Credentials email sent to: ${user.email}`);
  } catch (error) {
    logger.error('Error sending credentials email:', error);
    throw error;
  }
};
