// server/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'peoplepay360-enterprise-super-secret-jwt-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Access denied. No authentication token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Invalid or expired token. Please log in again.'
      });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
