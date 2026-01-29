/**
 * Report Routes
 * Handles reporting of listings, users, and violations
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');
const { reportValidation, validate } = require('../middleware/validation');

// Protected Routes - All report operations require authentication
router.use(verifyClerkToken);

// Create report
router.post(
  '/',
  reportValidation,
  validate,
  reportController.createReport
);

// Get user's reports
router.get('/my', reportController.getMyReports);

// Get report by ID
router.get('/:reportId', reportController.getReport);

// Update report
router.patch(
  '/:reportId',
  restrictTo('admin'),
  reportController.updateReport
);

// Delete report
router.delete(
  '/:reportId',
  restrictTo('admin'),
  reportController.deleteReport
);

// Admin routes
router.get(
  '/admin/all',
  restrictTo('admin'),
  reportController.getReports
);

router.post(
  '/:reportId/resolve',
  restrictTo('admin'),
  reportController.resolveReport
);

module.exports = router;
