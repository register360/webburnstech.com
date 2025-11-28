"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.logger = void 0;
const winston_1 = require("winston");
const redis_1 = require("redis");
exports.logger = (0, winston_1.createLogger)({
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
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL
});
exports.redisClient.on('error', (err) => exports.logger.error('Redis Client Error', err));
exports.redisClient.connect();
//# sourceMappingURL=appGlobals.js.map