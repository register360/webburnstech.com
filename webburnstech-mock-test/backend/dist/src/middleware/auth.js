"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../../server");
const authMiddleware = async (req, res, next) => {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Check if session is valid in Redis
        const sessionKey = `session:${decoded.userId}`;
        const storedToken = await server_1.redisClient.get(sessionKey);
        if (!storedToken || storedToken !== token) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
const adminAuthMiddleware = (req, res, next) => {
    // Simple admin auth - in production, use proper admin authentication
    const adminToken = req.header('X-Admin-Token');
    if (adminToken === process.env.ADMIN_TOKEN) {
        next();
    }
    else {
        res.status(401).json({ error: 'Admin access required' });
    }
};
exports.adminAuthMiddleware = adminAuthMiddleware;
