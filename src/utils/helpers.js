/**
 * Helper Functions
 * Common utility functions used across the application
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Generate random string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
exports.generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate random numeric code
 * @param {number} length - Length of code
 * @returns {string} Numeric code
 */
exports.generateNumericCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min).toString();
};

/**
 * Hash password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
exports.comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token expiry
 * @returns {string} JWT token
 */
exports.generateToken = (payload, expiresIn = '15m') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Format price
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted price
 */
exports.formatPrice = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format date
 * @param {Date} date - Date to format
 * @param {string} format - Date format
 * @returns {string} Formatted date
 */
exports.formatDate = (date, format = 'en-US') => {
  return new Intl.DateTimeFormat(format, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
  
  function toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
};

/**
 * Slugify text
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
exports.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Paginate results
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} Pagination object
 */
exports.paginate = (page = 1, limit = 20) => {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 20;
  const skip = (parsedPage - 1) * parsedLimit;
  
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip
  };
};

/**
 * Build pagination metadata
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
exports.paginationMeta = (total, page, limit) => {
  const pages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1
  };
};

/**
 * Sanitize object (remove null/undefined values)
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
exports.sanitizeObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null)
  );
};

/**
 * Pick fields from object
 * @param {object} obj - Source object
 * @param {Array<string>} fields - Fields to pick
 * @returns {object} Object with picked fields
 */
exports.pick = (obj, fields) => {
  return fields.reduce((result, field) => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
    return result;
  }, {});
};

/**
 * Omit fields from object
 * @param {object} obj - Source object
 * @param {Array<string>} fields - Fields to omit
 * @returns {object} Object without omitted fields
 */
exports.omit = (obj, fields) => {
  const result = { ...obj };
  fields.forEach(field => delete result[field]);
  return result;
};

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if phone is valid
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
exports.isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Generate reference number
 * @param {string} prefix - Reference prefix
 * @returns {string} Reference number
 */
exports.generateReference = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated text
 */
exports.truncate = (text, length = 100, suffix = '...') => {
  if (text.length <= length) return text;
  return text.substring(0, length) + suffix;
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
exports.deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get time ago string
 * @param {Date} date - Date to compare
 * @returns {string} Time ago string
 */
exports.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
};

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
exports.capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Generate OTP
 * @param {number} length - OTP length
 * @returns {string} OTP code
 */
exports.generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

/**
 * Check if date is past
 * @param {Date} date - Date to check
 * @returns {boolean} True if past
 */
exports.isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if date is future
 * @param {Date} date - Date to check
 * @returns {boolean} True if future
 */
exports.isFuture = (date) => {
  return new Date(date) > new Date();
};

/**
 * Add days to date
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
exports.addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {object} Parsed object
 */
exports.parseQueryString = (queryString) => {
  return Object.fromEntries(new URLSearchParams(queryString));
};

/**
 * Build query string from object
 * @param {object} obj - Object to convert
 * @returns {string} Query string
 */
exports.buildQueryString = (obj) => {
  return new URLSearchParams(obj).toString();
};

/**
 * Validate VIN (Vehicle Identification Number)
 * @param {string} vin - VIN to validate
 * @returns {boolean} True if valid
 */
exports.isValidVIN = (vin) => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin);
};

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @returns {number} Percentage
 */
exports.calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
exports.getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Is valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
exports.isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

module.exports = exports;
