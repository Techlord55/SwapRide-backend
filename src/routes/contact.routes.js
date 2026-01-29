const express = require('express');
const router = express.Router();
const {
  createSupportMessage,
  getAllSupportMessages,
  getSupportMessage,
  updateStatus,
  respondToMessage,
  getSupportStats,
  getMyMessages,
} = require('../controllers/contact.controller');
const { optionalAuth, protect, adminOnly } = require('../middleware/auth.middleware');

/**
 * Public routes
 */
// Create support message (accessible by everyone, including guests)
router.post('/support', optionalAuth, createSupportMessage);

/**
 * Private routes (authenticated users)
 */
// Get my support messages
router.get('/support/my-messages', protect, getMyMessages);

/**
 * Admin routes
 */
// Get all support messages
router.get('/support', protect, adminOnly, getAllSupportMessages);

// Get support stats
router.get('/support/stats', protect, adminOnly, getSupportStats);

// Get single support message
router.get('/support/:id', protect, adminOnly, getSupportMessage);

// Update support message status
router.patch('/support/:id/status', protect, adminOnly, updateStatus);

// Respond to support message
router.post('/support/:id/respond', protect, adminOnly, respondToMessage);

module.exports = router;
