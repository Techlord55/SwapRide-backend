/**
 * Input Validation Middleware
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * User registration validation
 */
exports.registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

/**
 * User login validation
 */
exports.loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Vehicle listing validation
 */
exports.vehicleValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('make')
    .trim()
    .notEmpty()
    .withMessage('Make is required'),
  body('model')
    .trim()
    .notEmpty()
    .withMessage('Model is required'),
  body('year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Please provide a valid year'),
  body('mileage')
    .isInt({ min: 0 })
    .withMessage('Mileage must be a positive number'),
  body('condition')
    .isIn(['new', 'used', 'certified_pre_owned'])
    .withMessage('Please provide a valid condition'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

/**
 * Part listing validation
 */
exports.partValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('partName')
    .trim()
    .notEmpty()
    .withMessage('Part name is required'),
  body('category')
    .isIn([
      'engine', 'transmission', 'suspension', 'brakes', 'electrical',
      'body', 'interior', 'exterior', 'wheels_tires', 'exhaust',
      'cooling', 'fuel_system', 'lights', 'accessories', 'other'
    ])
    .withMessage('Please provide a valid category'),
  body('condition')
    .isIn(['new', 'used', 'refurbished', 'salvage', 'oem', 'aftermarket'])
    .withMessage('Please provide a valid condition'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
];

/**
 * Swap proposal validation
 */
exports.swapValidation = [
  body('offeredVehicleId')
    .optional()
    .isString()
    .withMessage('Invalid offered vehicle ID'),
  body('requestedItemType')
    .isIn(['vehicle', 'part'])
    .withMessage('Invalid item type'),
  body('requestedItemId')
    .isString()
    .withMessage('Invalid item ID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
];

/**
 * Review validation
 */
exports.reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('reviewedUserId')
    .isString()
    .withMessage('Reviewed user ID is required')
];

/**
 * Report validation
 */
exports.reportValidation = [
  body('itemType')
    .isIn(['vehicle', 'part', 'user', 'swap', 'review'])
    .withMessage('Please provide a valid item type'),
  body('itemId')
    .isString()
    .withMessage('Item ID is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
];

/**
 * Message validation
 */
exports.messageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters')
];

/**
 * ID validation (works with CUID/UUID)
 */
exports.validateId = [
  param('id')
    .isString()
    .isLength({ min: 20, max: 30 })
    .withMessage('Invalid ID format')
];

/**
 * Pagination validation
 */
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Payment validation
 */
exports.validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .optional()
    .isIn(['card', 'bank_transfer', 'mobile_money', 'cash'])
    .withMessage('Invalid payment method'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

/**
 * Part validation (alias for consistency)
 */
exports.validatePart = exports.partValidation;

/**
 * Swap validation (alias for consistency)
 */
exports.validateSwap = exports.swapValidation;
