/**
 * Rate Limiter Middleware for Aikira Terminal
 * Protects API endpoints from abuse by limiting request rates
 */

const rateLimit = require('express-rate-limit');

// Load configuration from environment variables
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000; // 15 minutes default
const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || 100; // 100 requests per window default

// Create standard rate limiter
const standardLimiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS),
  max: parseInt(RATE_LIMIT_MAX_REQUESTS),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    details: 'You have exceeded the request rate limit. Please wait and try again.'
  },
  headers: true
});

// Create stricter rate limiter for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS),
  max: parseInt(RATE_LIMIT_MAX_REQUESTS) / 2, // Half the standard limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests to sensitive endpoint.',
    details: 'You have exceeded the request rate limit for this sensitive operation. Please wait and try again.'
  },
  headers: true
});

// Create very strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts.',
    details: 'You have exceeded the allowed authentication attempts. Please try again later.'
  },
  headers: true
});

// Special limiter for voice API endpoints
const voiceLimiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS),
  max: 30, // 30 voice requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many voice processing requests.',
    details: 'Voice processing is resource-intensive. Please wait before making more requests.'
  },
  headers: true
});

/**
 * Apply appropriate rate limiter based on route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rateLimiterMiddleware = (req, res, next) => {
  const path = req.path.toLowerCase();
  
  // Apply different rate limiters based on route path
  if (path.includes('/auth') || path.includes('/login') || path.includes('/signup')) {
    return authLimiter(req, res, next);
  } else if (path.includes('/speech') || path.includes('/voice') || path.includes('/transcribe')) {
    return voiceLimiter(req, res, next);
  } else if (path.includes('/admin') || path.includes('/settings') || path.includes('/delete')) {
    return strictLimiter(req, res, next);
  } else {
    return standardLimiter(req, res, next);
  }
};

module.exports = rateLimiterMiddleware;