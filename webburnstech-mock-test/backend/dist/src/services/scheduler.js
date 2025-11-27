"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("./emailService");
const server_1 = require("../../server");
const startScheduler = () => {
    // Schedule credential sending for 14:00 IST on 30-11-2025 (08:30 UTC)
    node_cron_1.default.schedule('30 8 30 11 *', async () => {
        try {
            server_1.logger.info('Starting scheduled credential sending...');
            const users = await User_1.default.find({
                status: 'accepted',
                credentialsSentAt: { $exists: false }
            });
            server_1.logger.info(`Found ${users.length} users to send credentials`);
            for (const user of users) {
                try {
                    await (0, emailService_1.sendCredentialsEmail)(user);
                    user.credentialsSentAt = new Date();
                    await user.save();
                    server_1.logger.info(`Credentials sent to: ${user.email}`);
                    // Delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    server_1.logger.error(`Failed to send credentials to ${user.email}:`, error);
                }
            }
            server_1.logger.info('Scheduled credential sending completed');
        }
        catch (error) {
            server_1.logger.error('Scheduled task error:', error);
        }
    });
    server_1.logger.info('Scheduler started - credentials will be sent on 30-11-2025 at 14:00 IST');
};
exports.startScheduler = startScheduler;
