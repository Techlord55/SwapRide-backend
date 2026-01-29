/**
 * Admin Routes
 * Handles administrative operations and dashboard
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');

// Welcome endpoint (public for testing)
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SwapRide Admin API',
    version: '1.0.0',
    endpoints: {
      dashboard: '/dashboard/stats',
      users: '/users',
      listings: '/listings',
      swaps: '/swaps',
      payments: '/payments',
      reports: '/reports',
      reviews: '/reviews'
    },
    note: 'All endpoints require admin authentication'
  });
});

// All routes below require admin authentication
router.use(verifyClerkToken);
router.use(restrictTo('admin'));

// Dashboard Statistics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/analytics', adminController.getAnalytics);
router.get('/dashboard/revenue', adminController.getRevenueStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/stats', adminController.getUserStats);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/verify', adminController.verifyUser);
router.patch('/users/:userId/unverify', adminController.unverifyUser);
router.patch('/users/:userId/ban', adminController.banUser);
router.patch('/users/:userId/unban', adminController.unbanUser);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// Listing Management
router.get('/listings', adminController.getAllListings);
router.get('/listings/pending', adminController.getPendingListings);
router.get('/listings/flagged', adminController.getFlaggedListings);
router.patch('/listings/:listingId/approve', adminController.approveListing);
router.patch('/listings/:listingId/reject', adminController.rejectListing);
router.delete('/listings/:listingId', adminController.deleteListing);

// Swap Management
router.get('/swaps', adminController.getAllSwaps);
router.get('/swaps/stats', adminController.getSwapStats);
router.get('/swaps/disputed', adminController.getDisputedSwaps);
router.patch('/swaps/:swapId/resolve', adminController.resolveSwapDispute);

// Payment Management
router.get('/payments', adminController.getAllPayments);
router.get('/payments/stats', adminController.getPaymentStats);
router.get('/payments/failed', adminController.getFailedPayments);
router.post('/payments/:paymentId/refund', adminController.processRefund);

// Report Management
router.get('/reports', adminController.getAllReports);
router.get('/reports/pending', adminController.getPendingReports);
router.get('/reports/stats', adminController.getReportStats);
router.patch('/reports/:reportId/resolve', adminController.resolveReport);
router.patch('/reports/:reportId/reject', adminController.rejectReport);

// Review Management
router.get('/reviews', adminController.getAllReviews);
router.get('/reviews/pending', adminController.getPendingReviews);
router.get('/reviews/flagged', adminController.getFlaggedReviews);
router.patch('/reviews/:reviewId/approve', adminController.approveReview);
router.patch('/reviews/:reviewId/reject', adminController.rejectReview);
router.delete('/reviews/:reviewId', adminController.deleteReview);

// Content Moderation
router.get('/moderation/queue', adminController.getModerationQueue);
router.post('/moderation/bulk-action', adminController.bulkModeration);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/settings/features', adminController.getFeatureFlags);
router.patch('/settings/features', adminController.updateFeatureFlags);

// Categories & Tags
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:categoryId', adminController.updateCategory);
router.delete('/categories/:categoryId', adminController.deleteCategory);

// Notifications
router.post('/notifications/broadcast', adminController.broadcastNotification);
router.post('/notifications/targeted', adminController.sendTargetedNotification);

// Logs & Audit
router.get('/logs/activity', adminController.getActivityLogs);
router.get('/logs/security', adminController.getSecurityLogs);
router.get('/logs/errors', adminController.getErrorLogs);

// Export Data
router.get('/export/users', adminController.exportUsers);
router.get('/export/listings', adminController.exportListings);
router.get('/export/transactions', adminController.exportTransactions);

// System Health
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/performance', adminController.getPerformanceMetrics);

// Cache Management
router.post('/cache/clear', adminController.clearCache);
router.get('/cache/stats', adminController.getCacheStats);

module.exports = router;
