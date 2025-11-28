"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const appGlobals_1 = require("../lib/appGlobals");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const sessionKey = `session:${decoded.userId}`;
        const storedToken = await appGlobals_1.redisClient.get(sessionKey);
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
    const adminToken = req.header('X-Admin-Token');
    if (adminToken === process.env.ADMIN_TOKEN) {
        next();
    }
    else {
        res.status(401).json({ error: 'Admin access required' });
    }
};
exports.adminAuthMiddleware = adminAuthMiddleware;
//# sourceMappingURL=auth.js.map