"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.redisClient = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const appGlobals_1 = require("./src/lib/appGlobals");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return appGlobals_1.logger; } });
Object.defineProperty(exports, "redisClient", { enumerable: true, get: function () { return appGlobals_1.redisClient; } });
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3000;
mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/webburnstech')
    .then(() => appGlobals_1.logger.info('MongoDB connected successfully'))
    .catch((error) => appGlobals_1.logger.error('MongoDB connection error:', error));
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/login', authLimiter);
app.use('/api/verify-otp', authLimiter);
const auth_1 = __importDefault(require("./src/routes/auth"));
const exam_1 = __importDefault(require("./src/routes/exam"));
const admin_1 = __importDefault(require("./src/routes/admin"));
const contact_1 = __importDefault(require("./src/routes/contact"));
app.use('/api/auth', auth_1.default);
app.use('/api/exam', exam_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/contact', contact_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use((err, req, res, next) => {
    appGlobals_1.logger.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.listen(PORT, () => {
    appGlobals_1.logger.info(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map