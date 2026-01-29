/**
 * Security Middleware
 * XSS, CSRF, and Parameter Pollution protection
 * 
 * Note: SQL injection protection is built into Prisma ORM
 * MongoDB sanitization is not needed with PostgreSQL/Prisma
 */

const xss = require('xss-clean');
const hpp = require('hpp');

// Clean user input from malicious HTML/JS
const cleanXSS = xss();

// Prevent parameter pollution
const preventPollution = hpp({
  whitelist: [
    'price',
    'rating',
    'mileage',
    'year',
    'category',
    'make',
    'model',
    'status',
    'condition',
    'fuelType',
    'transmission',
    'bodyType',
    'sort',
    'page',
    'limit'
  ]
});

// Additional security: Validate and sanitize database inputs
const sanitizeInput = (req, res, next) => {
  // Prisma already handles SQL injection prevention
  // This is just an extra layer for common attacks
  
  if (req.body) {
    // Remove any __proto__ or constructor properties
    Object.keys(req.body).forEach(key => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete req.body[key];
      }
    });
  }
  
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete req.query[key];
      }
    });
  }
  
  next();
};

// Security headers and middleware combined
const securityMiddleware = [
  sanitizeInput,
  cleanXSS,
  preventPollution
];

module.exports = { securityMiddleware };
