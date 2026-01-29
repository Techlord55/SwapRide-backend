/**
 * Swap Routes
 * Handles vehicle and parts swap operations
 */

const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swap.controller');
const { verifyClerkToken } = require('../middleware/clerk.middleware');
const { swapValidation, validate } = require('../middleware/validation');

// Protected Routes - All swap operations require authentication
router.use(verifyClerkToken);

// Get all swaps for user
router.get('/', swapController.getUserSwaps);

// Get swap statistics
router.get('/stats', swapController.getSwapStats);

// Get pending swaps
router.get('/pending', swapController.getPendingSwaps);

// Get active swaps
router.get('/active', swapController.getActiveSwaps);

// Get completed swaps
router.get('/completed', swapController.getCompletedSwaps);

// Get single swap details
router.get('/:swapId', swapController.getSwapById);

// Propose a swap
router.post(
  '/propose',
  swapValidation,
  validate,
  swapController.proposeSwap
);

// Accept a swap proposal
router.patch(
  '/:swapId/accept',
  swapController.checkSwapOwnership,
  swapController.acceptSwap
);

// Reject a swap proposal
router.patch(
  '/:swapId/reject',
  swapController.checkSwapOwnership,
  swapController.rejectSwap
);

// Counter offer
router.post(
  '/:swapId/counter',
  swapController.checkSwapOwnership,
  swapValidation,
  validate,
  swapController.counterOffer
);

// Cancel swap
router.patch(
  '/:swapId/cancel',
  swapController.cancelSwap
);

// Mark swap as completed
router.patch(
  '/:swapId/complete',
  swapController.completeSwap
);

// Add notes/comments to swap
router.post(
  '/:swapId/notes',
  swapController.addSwapNote
);

// Update swap status
router.patch(
  '/:swapId/status',
  swapController.updateSwapStatus
);

// Report swap issue
router.post(
  '/:swapId/report',
  swapController.reportSwapIssue
);

// Get swap history
router.get('/:swapId/history', swapController.getSwapHistory);

// Swap recommendations (AI-based matching)
router.get(
  '/recommendations/:itemType/:itemId',
  swapController.getSwapRecommendations
);

module.exports = router;
