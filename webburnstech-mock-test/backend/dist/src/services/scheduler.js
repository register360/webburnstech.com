"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("./emailService");
const appGlobals_1 = require("../lib/appGlobals");
const startScheduler = () => {
    node_cron_1.default.schedule('30 8 30 11 *', async () => {
        try {
            appGlobals_1.logger.info('Starting scheduled credential sending...');
            const users = await User_1.default.find({
                status: 'accepted',
                credentialsSentAt: { $exists: false }
            });
            appGlobals_1.logger.info(`Found ${users.length} users to send credentials`);
            for (const user of users) {
                try {
                    await (0, emailService_1.sendCredentialsEmail)(user);
                    user.credentialsSentAt = new Date();
                    await user.save();
                    appGlobals_1.logger.info(`Credentials sent to: ${user.email}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (error) {
                    appGlobals_1.logger.error(`Failed to send credentials to ${user.email}:`, error);
                }
            }
            appGlobals_1.logger.info('Scheduled credential sending completed');
        }
        catch (error) {
            appGlobals_1.logger.error('Scheduled task error:', error);
        }
    });
    appGlobals_1.logger.info('Scheduler started - credentials will be sent on 30-11-2025 at 14:00 IST');
};
exports.startScheduler = startScheduler;
//# sourceMappingURL=scheduler.js.map