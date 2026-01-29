/**
 * Authentication Middleware - Prisma Version
 * Protect routes and verify JWT tokens
 */

const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Protect routes - Verify JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountType: true,
        accountStatus: true,
        isActive: true,
        passwordChangedAt: true
      }
    });

    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'User account is inactive');
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, `User account is ${user.accountStatus}`);
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        throw new ApiError(401, 'Password was recently changed. Please log in again');
      }
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw error;
  }
});

/**
 * Restrict routes to specific roles
 * @param  {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.accountType)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
};

/**
 * Optional authentication - Set user if token exists
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          accountType: true,
          accountStatus: true,
          isActive: true
        }
      });
      
      if (user && user.isActive && user.accountStatus === 'active') {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

/**
 * Admin only access
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admin only.');
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth,
  adminOnly
};
