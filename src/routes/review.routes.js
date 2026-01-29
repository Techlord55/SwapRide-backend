/**
 * Review Routes
 * Handles user and listing reviews/ratings
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');
const { reviewValidation, validate } = require('../middleware/validation');

// Public routes - Get reviews
router.get('/user/:userId', reviewController.getReviews);
router.get('/vehicle/:vehicleId', reviewController.getVehicleReviews);

// Protected Routes
router.use(verifyClerkToken);

// Create review
router.post(
  '/',
  reviewValidation,
  validate,
  reviewController.createReview
);

// Update review
router.put(
  '/:reviewId',
  reviewValidation,
  validate,
  reviewController.updateReview
);

// Delete review
router.delete(
  '/:reviewId',
  reviewController.deleteReview
);

// Get my reviews (given)
router.get('/my/given', reviewController.getMyGivenReviews);

// Get my reviews (received)
router.get('/my/received', reviewController.getMyReceivedReviews);

// Admin routes
router.patch(
  '/:reviewId/approve',
  restrictTo('admin'),
  reviewController.approveReview
);

router.patch(
  '/:reviewId/reject',
  restrictTo('admin'),
  reviewController.rejectReview
);

module.exports = router;
