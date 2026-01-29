/**
 * Authentication Routes
 * Handles user registration, login, and verification
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  validate
} = require('../middleware/validation');

// Public routes
router.post(
  '/register',
  authLimiter,
  registerValidation,
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/update-password', protect, authController.updatePassword);
router.post('/send-phone-code', protect, authLimiter, authController.sendPhoneVerificationCode);
router.post('/verify-phone', protect, authLimiter, authController.verifyPhone);
router.post('/logout', protect, authController.logout);

// Clerk webhook (for syncing Clerk users)
router.post('/clerk-webhook', authController.clerkWebhook);

module.exports = router;
