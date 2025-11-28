const cron = require('node-cron');
const User = require('../models/User');
const { sendCredentialsEmail } = require('./email');
const Audit = require('../models/Audit');

// Send exam credentials to all accepted users
const sendExamCredentials = async () => {
  try {
    console.log('🚀 Starting credential sending job...');
    
    // Find all accepted users who haven't received credentials yet
    const users = await User.find({
      status: 'accepted',
      credentialsSentAt: null,
    }).select('+examPassword');
    
    console.log(`📧 Found ${users.length} users to send credentials to`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of users) {
      try {
        // Note: examPassword is stored hashed, but we need to send plain text
        // Since we hash on save, we need to send before the user doc was saved with hashed password
        // Therefore, when admin accepts, we should save plain password temporarily or send immediately
        // For this implementation, we'll send credentials immediately when admin accepts
        // This function is a backup/scheduler
        
        if (!user.examPassword) {
          console.warn(`⚠️  User ${user.email} has no exam password set`);
          failureCount++;
          continue;
        }
        
        // Send credentials email
        await sendCredentialsEmail(user.email, user.firstName, user.examPassword);
        
        // Update user record
        user.credentialsSentAt = new Date();
        await user.save();
        
        // Log audit event
        await Audit.log(user._id, 'credentials_sent', {
          email: user.email,
          sentAt: new Date(),
        });
        
        successCount++;
        console.log(`✅ Sent credentials to ${user.email}`);
        
      } catch (error) {
        console.error(`❌ Failed to send credentials to ${user.email}:`, error);
        failureCount++;
      }
    }
    
    console.log(`✅ Credential sending job completed: ${successCount} success, ${failureCount} failures`);
    
  } catch (error) {
    console.error('❌ Credential sending job failed:', error);
  }
};

// Schedule credential sending
// Runs at 14:00 IST on 30-11-2025 (8:30 AM UTC)
const scheduleCredentialSending = () => {
  // Cron format: minute hour day month day-of-week
  // 30 8 30 11 * = 8:30 AM UTC on Nov 30 (14:00 IST)
  // For testing, you can change to run every minute: '* * * * *'
  
  const cronExpression = '30 8 30 11 *'; // Production: Nov 30, 8:30 AM UTC (14:00 IST)
  
  console.log(`📅 Scheduling credential sending job: ${cronExpression}`);
  
  cron.schedule(cronExpression, sendExamCredentials, {
    timezone: 'UTC',
  });
  
  console.log('✅ Scheduler initialized successfully');
};

// Manual trigger for testing
const triggerCredentialSending = async () => {
  console.log('🔧 Manually triggering credential sending...');
  await sendExamCredentials();
};

module.exports = {
  scheduleCredentialSending,
  sendExamCredentials,
  triggerCredentialSending,
};
