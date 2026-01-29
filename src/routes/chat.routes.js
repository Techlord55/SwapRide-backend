/**
 * Chat Routes
 * Handles real-time messaging between users
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyClerkToken } = require('../middleware/clerk.middleware');
const { messageValidation, validate } = require('../middleware/validation');

// Protected Routes - All chat operations require authentication
router.use(verifyClerkToken);

// Get all conversations for user
router.get('/conversations', chatController.getConversations);

// Create or get conversation
router.post('/conversations', chatController.createConversation);

// Delete conversation
router.delete('/conversations/:conversationId', chatController.deleteConversation);

// Get messages in conversation
router.get(
  '/:conversationId/messages',
  chatController.getMessages
);

// Send message
router.post(
  '/:conversationId/messages',
  messageValidation,
  validate,
  chatController.sendMessage
);

// Mark conversation as read
router.patch(
  '/:conversationId/read',
  chatController.markAsRead
);

// Delete message
router.delete('/messages/:messageId', chatController.deleteMessage);

// Get unread messages count
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
