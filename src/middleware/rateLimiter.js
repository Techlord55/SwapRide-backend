/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');

/**
 * General API rate limiter
 */
exports.rateLimiter = rateLimit({
  windowMs: config.security?.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
  max: config.security?.rateLimitMax || 100,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

/**
 * Strict rate limiter for authentication routes
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for creating listings
 */
exports.createListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 listings per hour
  message: {
    status: 'error',
    message: 'Too many listings created, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for chat/messaging
 */
exports.messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    status: 'error',
    message: 'Slow down! Too many messages sent'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for search queries
 */
exports.searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: {
    status: 'error',
    message: 'Too many search requests, please wait a moment'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for file uploads
 */
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    status: 'error',
    message: 'Upload limit reached, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
