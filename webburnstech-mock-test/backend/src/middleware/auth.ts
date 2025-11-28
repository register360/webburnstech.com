import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisClient } from '../lib/appGlobals';

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Check if session is valid in Redis
    const sessionKey = `session:${decoded.userId}`;
    const storedToken = await redisClient.get(sessionKey);

    if (!storedToken || storedToken !== token) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminAuthMiddleware = (req: any, res: Response, next: NextFunction) => {
  // Simple admin auth - in production, use proper admin authentication
  const adminToken = req.header('X-Admin-Token');
  
  if (adminToken === process.env.ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Admin access required' });
  }
};
