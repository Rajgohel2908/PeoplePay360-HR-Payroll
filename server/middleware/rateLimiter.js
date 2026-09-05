// server/middleware/rateLimiter.js
const rateLimitMap = new Map();

/**
 * Lightweight in-memory rate limiter
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds (default: 15 mins)
 */
function createRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = rateLimitMap.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      rateLimitMap.set(ip, record);
    } else {
      record.count += 1;
    }

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP. Please try again later.'
      });
    }

    // Periodically clean up stale entries
    if (rateLimitMap.size > 10000) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now - val.startTime > windowMs) {
          rateLimitMap.delete(key);
        }
      }
    }

    next();
  };
}

const isDev = process.env.NODE_ENV !== 'production';
const authLimiter = isDev ? (req, res, next) => next() : createRateLimiter(30, 15 * 60 * 1000);
const apiLimiter = isDev ? (req, res, next) => next() : createRateLimiter(1000, 15 * 60 * 1000);

module.exports = { createRateLimiter, authLimiter, apiLimiter };
