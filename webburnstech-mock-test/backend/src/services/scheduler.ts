import cron from 'node-cron';
import User from '../models/User';
import { sendCredentialsEmail } from './emailService';
import { logger } from '../../server';

export const startScheduler = () => {
  // Schedule credential sending for 14:00 IST on 30-11-2025 (08:30 UTC)
  cron.schedule('30 8 30 11 *', async () => {
    try {
      logger.info('Starting scheduled credential sending...');

      const users = await User.find({
        status: 'accepted',
        credentialsSentAt: { $exists: false }
      });

      logger.info(`Found ${users.length} users to send credentials`);

      for (const user of users) {
        try {
          await sendCredentialsEmail(user);
          user.credentialsSentAt = new Date();
          await user.save();
          logger.info(`Credentials sent to: ${user.email}`);
          
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Failed to send credentials to ${user.email}:`, error);
        }
      }

      logger.info('Scheduled credential sending completed');
    } catch (error) {
      logger.error('Scheduled task error:', error);
    }
  });

  logger.info('Scheduler started - credentials will be sent on 30-11-2025 at 14:00 IST');
};
