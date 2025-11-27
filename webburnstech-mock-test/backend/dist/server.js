"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.redisClient = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = __importDefault(require("redis"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = require("winston");
// Load environment variables
dotenv_1.default.config();
// Initialize Express
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3000;
// Logger configuration
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.json()),
    transports: [
        new winston_1.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.transports.File({ filename: 'combined.log' }),
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple())
        })
    ]
});
exports.logger = logger;
// MongoDB connection
mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/webburnstech')
    .then(() => logger.info('MongoDB connected successfully'))
    .catch((error) => logger.error('MongoDB connection error:', error));
// Redis client
const redisClient = redis_1.default.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
exports.redisClient = redisClient;
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// Auth rate limiting
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/login', authLimiter);
app.use('/api/verify-otp', authLimiter);
// Routes
const auth_1 = __importDefault(require("./src/routes/auth"));
const exam_1 = __importDefault(require("./src/routes/exam"));
const admin_1 = __importDefault(require("./src/routes/admin"));
const contact_1 = __importDefault(require("./src/routes/contact"));
app.use('/api/auth', auth_1.default);
app.use('/api/exam', exam_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/contact', contact_1.default);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
