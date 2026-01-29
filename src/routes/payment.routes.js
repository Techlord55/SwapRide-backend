/**
 * Payment Routes
 * Handles payment processing with Kora gateway
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');
const { validatePayment } = require('../middleware/validation');

// Webhook - No authentication required (verified by signature)
router.post('/webhook', paymentController.handleWebhook);

// Public routes
router.get('/currencies', paymentController.getSupportedCurrencies);
router.get('/methods', paymentController.getPaymentMethods);

// Protected Routes
router.use(verifyClerkToken);

// Initialize payment
router.post(
  '/initialize',
  validatePayment,
  paymentController.initializePayment
);

// Verify payment
router.get('/verify/:reference', paymentController.verifyPayment);

// Get payment details
router.get('/:paymentId', paymentController.getPaymentDetails);

// Get user payment history
router.get('/user/history', paymentController.getUserPayments);

// Cancel payment
router.post('/:paymentId/cancel', paymentController.cancelPayment);

// Request refund
router.post('/:paymentId/refund', paymentController.requestRefund);

// Subscription payments
router.post(
  '/subscription/initialize',
  paymentController.initializeSubscriptionPayment
);

router.post(
  '/subscription/cancel',
  paymentController.cancelSubscription
);

// Featured listing payment
router.post(
  '/feature-listing',
  paymentController.payForFeaturedListing
);

// Boost ad payment
router.post(
  '/boost-ad',
  paymentController.payForBoostedAd
);

// Escrow payment (future feature)
router.post(
  '/escrow/initialize',
  paymentController.initializeEscrowPayment
);

router.post(
  '/escrow/:escrowId/release',
  paymentController.releaseEscrowPayment
);

// Admin routes
router.get(
  '/admin/all',
  restrictTo('admin'),
  paymentController.getAllPayments
);

router.get(
  '/admin/stats',
  restrictTo('admin'),
  paymentController.getPaymentStats
);

router.post(
  '/:paymentId/admin/refund',
  restrictTo('admin'),
  paymentController.processRefund
);

router.patch(
  '/:paymentId/admin/status',
  restrictTo('admin'),
  paymentController.updatePaymentStatus
);

module.exports = router;
