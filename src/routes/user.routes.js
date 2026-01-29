/**
 * User Routes
 * Handles user profile, preferences, and account management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyClerkToken, restrictTo } = require('../middleware/clerk.middleware');
const { upload } = require('../middleware/upload.middleware');

// Protect all routes after this middleware
router.use(verifyClerkToken);

// Profile Routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile/avatar', upload.single('avatar'), userController.updateAvatar);
router.delete('/profile/avatar', userController.deleteAvatar);

// User Statistics
router.get('/stats', userController.getUserStats);

// User Listings
router.get('/listings', userController.getUserListings);
router.get('/listings/active', userController.getActiveListings);
router.get('/listings/sold', userController.getSoldListings);

// User Swaps
router.get('/swaps', userController.getUserSwaps);
router.get('/swaps/pending', userController.getPendingSwaps);
router.get('/swaps/completed', userController.getCompletedSwaps);

// Favorites/Wishlist
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:itemType/:itemId', userController.addToFavorites);
router.delete('/favorites/:itemType/:itemId', userController.removeFromFavorites);

// Saved Searches
router.get('/saved-searches', userController.getSavedSearches);
router.post('/saved-searches', userController.createSavedSearch);
router.delete('/saved-searches/:searchId', userController.deleteSavedSearch);

// Notifications
router.get('/notifications', userController.getNotifications);
router.get('/notifications/unread', userController.getUnreadNotifications);
router.put('/notifications/:notificationId/read', userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);
router.delete('/notifications/:notificationId', userController.deleteNotification);

// Preferences
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

// Reviews
router.get('/reviews', userController.getUserReviews);
router.get('/reviews/received', userController.getReceivedReviews);
router.get('/reviews/given', userController.getGivenReviews);

// Payment History
router.get('/payments', userController.getPaymentHistory);

// Subscription
router.get('/subscription', userController.getSubscription);
router.post('/subscription/upgrade', userController.upgradeSubscription);
router.post('/subscription/cancel', userController.cancelSubscription);

// Security
router.put('/change-password', userController.changePassword);
router.post('/verify-email', userController.verifyEmail);
router.post('/verify-phone', userController.verifyPhone);
router.post('/request-verification', userController.requestVerification);

// Account Management
router.delete('/account', userController.deleteAccount);
router.post('/account/deactivate', userController.deactivateAccount);
router.post('/account/reactivate', userController.reactivateAccount);

// Admin Routes
router.get('/', restrictTo('admin'), userController.getAllUsers);
router.get('/:userId', userController.getUserById);
router.put('/:userId/ban', restrictTo('admin'), userController.banUser);
router.put('/:userId/unban', restrictTo('admin'), userController.unbanUser);
router.put('/:userId/role', restrictTo('admin'), userController.updateUserRole);
router.delete('/:userId', restrictTo('admin'), userController.deleteUser);

module.exports = router;
