const jwt = require('jsonwebtoken');
const { redisClient } = require('../../server');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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

const adminAuthMiddleware = (req, res, next) => {
  const adminToken = req.header('X-Admin-Token');
  
  if (adminToken === process.env.ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Admin access required' });
  }
};

module.exports = { authMiddleware, adminAuthMiddleware };