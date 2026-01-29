/**
 * Notification Service
 * Unified notification management across email, SMS, and in-app channels
 */

const Notification = require('../models/Notification.model');
const { sendEmail } = require('./email.service');
const { sendSMS } = require('./sms.service');
const { ApiError } = require('../utils/ApiError');

/**
 * Notification types enum
 */
const NotificationTypes = {
  // Swap related
  SWAP_PROPOSAL_RECEIVED: 'swap_proposal_received',
  SWAP_ACCEPTED: 'swap_accepted',
  SWAP_REJECTED: 'swap_rejected',
  SWAP_COUNTER_OFFER: 'swap_counter_offer',
  SWAP_COMPLETED: 'swap_completed',
  SWAP_CANCELLED: 'swap_cancelled',

  // Message related
  NEW_MESSAGE: 'new_message',
  MESSAGE_REPLY: 'message_reply',

  // Listing related
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  LISTING_EXPIRED: 'listing_expired',
  LISTING_VIEW: 'listing_view',
  LISTING_FAVORITE: 'listing_favorite',

  // Offer related
  NEW_OFFER: 'new_offer',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_REJECTED: 'offer_rejected',

  // Review related
  NEW_REVIEW: 'new_review',
  REVIEW_RESPONSE: 'review_response',

  // Payment related
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_ACTIVE: 'subscription_active',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',

  // Account related
  ACCOUNT_VERIFIED: 'account_verified',
  PASSWORD_CHANGED: 'password_changed',
  SECURITY_ALERT: 'security_alert',
  ACCOUNT_SUSPENDED: 'account_suspended',

  // Admin related
  REPORT_RECEIVED: 'report_received',
  REPORT_RESOLVED: 'report_resolved',

  // System
  SYSTEM_UPDATE: 'system_update',
  MAINTENANCE_NOTICE: 'maintenance_notice'
};

/**
 * Create in-app notification
 * @param {String} userId - User ID
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (userId, notificationData) => {
  try {
    const notification = await Notification.create({
      user: userId,
      ...notificationData
    });

    // Emit real-time notification via Socket.IO if available
    const io = global.io || require('../server').io;
    if (io) {
      io.to(`user_${userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw ApiError.internal('Failed to create notification');
  }
};

/**
 * Send notification across all enabled channels
 * @param {String} userId - User ID
 * @param {Object} notificationData - Notification data
 * @param {Object} channels - Channels to use {email, sms, inApp}
 * @returns {Promise<Object>} Notification result
 */
const sendNotification = async (userId, notificationData, channels = { inApp: true }) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const results = {
      inApp: null,
      email: null,
      sms: null
    };

    // In-app notification
    if (channels.inApp !== false) {
      results.inApp = await createNotification(userId, notificationData);
    }

    // Email notification
    if (channels.email && user.email && user.notificationSettings?.email) {
      try {
        const emailTemplate = getEmailTemplate(notificationData.type);
        if (emailTemplate) {
          results.email = await sendEmail({
            to: user.email,
            subject: notificationData.title,
            template: emailTemplate,
            context: {
              userName: user.firstName,
              ...notificationData.data
            }
          });
        }
      } catch (error) {
        console.error('Email notification error:', error);
      }
    }

    // SMS notification
    if (channels.sms && user.phone && user.notificationSettings?.sms) {
      try {
        const smsMessage = getSMSMessage(notificationData);
        if (smsMessage) {
          results.sms = await sendSMS(user.phone, smsMessage);
        }
      } catch (error) {
        console.error('SMS notification error:', error);
      }
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
};

/**
 * Send swap proposal notification
 */
const notifySwapProposal = async (receiverId, swapData) => {
  return await sendNotification(
    receiverId,
    {
      type: NotificationTypes.SWAP_PROPOSAL_RECEIVED,
      title: 'New Swap Proposal',
      message: `${swapData.initiatorName} wants to swap with your ${swapData.itemTitle}`,
      data: {
        swapId: swapData.swapId,
        initiatorName: swapData.initiatorName,
        itemTitle: swapData.itemTitle
      },
      actionUrl: `/swaps/${swapData.swapId}`
    },
    { inApp: true, email: true, sms: false }
  );
};

/**
 * Send swap accepted notification
 */
const notifySwapAccepted = async (initiatorId, swapData) => {
  return await sendNotification(
    initiatorId,
    {
      type: NotificationTypes.SWAP_ACCEPTED,
      title: 'Swap Accepted!',
      message: `${swapData.receiverName} accepted your swap proposal`,
      data: {
        swapId: swapData.swapId,
        receiverName: swapData.receiverName
      },
      actionUrl: `/swaps/${swapData.swapId}`
    },
    { inApp: true, email: true, sms: true }
  );
};

/**
 * Send new message notification
 */
const notifyNewMessage = async (recipientId, messageData) => {
  return await sendNotification(
    recipientId,
    {
      type: NotificationTypes.NEW_MESSAGE,
      title: 'New Message',
      message: `${messageData.senderName} sent you a message`,
      data: {
        conversationId: messageData.conversationId,
        senderName: messageData.senderName,
        preview: messageData.preview
      },
      actionUrl: `/messages/${messageData.conversationId}`
    },
    { inApp: true, email: false, sms: false }
  );
};

/**
 * Send new review notification
 */
const notifyNewReview = async (userId, reviewData) => {
  return await sendNotification(
    userId,
    {
      type: NotificationTypes.NEW_REVIEW,
      title: 'New Review Received',
      message: `${reviewData.reviewerName} left you a ${reviewData.rating}-star review`,
      data: {
        reviewId: reviewData.reviewId,
        reviewerName: reviewData.reviewerName,
        rating: reviewData.rating
      },
      actionUrl: `/reviews/${reviewData.reviewId}`
    },
    { inApp: true, email: true, sms: false }
  );
};

/**
 * Send payment success notification
 */
const notifyPaymentSuccess = async (userId, paymentData) => {
  return await sendNotification(
    userId,
    {
      type: NotificationTypes.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: `Your payment of $${paymentData.amount} was successful`,
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        reference: paymentData.reference
      },
      actionUrl: `/payments/${paymentData.paymentId}`
    },
    { inApp: true, email: true, sms: true }
  );
};

/**
 * Send listing approved notification
 */
const notifyListingApproved = async (userId, listingData) => {
  return await sendNotification(
    userId,
    {
      type: NotificationTypes.LISTING_APPROVED,
      title: 'Listing Approved',
      message: `Your listing "${listingData.title}" is now live!`,
      data: {
        listingId: listingData.listingId,
        title: listingData.title,
        type: listingData.type
      },
      actionUrl: `/${listingData.type}s/${listingData.listingId}`
    },
    { inApp: true, email: true, sms: true }
  );
};

/**
 * Send subscription expiring notification
 */
const notifySubscriptionExpiring = async (userId, subscriptionData) => {
  return await sendNotification(
    userId,
    {
      type: NotificationTypes.SUBSCRIPTION_EXPIRING,
      title: 'Subscription Expiring Soon',
      message: `Your ${subscriptionData.planName} subscription expires in ${subscriptionData.daysLeft} days`,
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        daysLeft: subscriptionData.daysLeft
      },
      actionUrl: '/subscription/renew'
    },
    { inApp: true, email: true, sms: false }
  );
};

/**
 * Send bulk notifications
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Bulk notification result
 */
const sendBulkNotifications = async (userIds, notificationData) => {
  try {
    const notifications = userIds.map(userId => ({
      user: userId,
      ...notificationData
    }));

    const created = await Notification.insertMany(notifications);

    // Emit to all users via Socket.IO
    const io = global.io || require('../server').io;
    if (io) {
      userIds.forEach(userId => {
        io.to(`user_${userId}`).emit('notification', notificationData);
      });
    }

    return {
      success: true,
      count: created.length
    };
  } catch (error) {
    console.error('Bulk notification error:', error);
    throw ApiError.internal('Failed to send bulk notifications');
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return { success: true };
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type
  } = options;

  const query = { user: userId };
  if (unreadOnly) query.isRead = false;
  if (type) query.type = type;

  const notifications = await Notification.find(query)
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    user: userId,
    isRead: false
  });

  return {
    notifications,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
      hasMore: page * limit < total
    },
    unreadCount
  };
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await notification.remove();
  return { success: true };
};

/**
 * Clear all notifications
 */
const clearAllNotifications = async (userId) => {
  await Notification.deleteMany({ user: userId });
  return { success: true };
};

/**
 * Helper: Get email template name for notification type
 */
function getEmailTemplate(type) {
  const templateMap = {
    [NotificationTypes.SWAP_PROPOSAL_RECEIVED]: 'swap-proposal',
    [NotificationTypes.SWAP_ACCEPTED]: 'swap-accepted',
    [NotificationTypes.NEW_REVIEW]: 'new-review',
    [NotificationTypes.PAYMENT_SUCCESS]: 'payment-success',
    [NotificationTypes.LISTING_APPROVED]: 'listing-approved',
    [NotificationTypes.SUBSCRIPTION_EXPIRING]: 'subscription-expiring'
  };

  return templateMap[type] || null;
}

/**
 * Helper: Get SMS message for notification type
 */
function getSMSMessage(notificationData) {
  const { type, message } = notificationData;

  // Only send SMS for important notifications
  const smsEnabledTypes = [
    NotificationTypes.SWAP_ACCEPTED,
    NotificationTypes.PAYMENT_SUCCESS,
    NotificationTypes.LISTING_APPROVED,
    NotificationTypes.SECURITY_ALERT
  ];

  if (!smsEnabledTypes.includes(type)) {
    return null;
  }

  return `SwapRide: ${message}`;
}

module.exports = {
  NotificationTypes,
  createNotification,
  sendNotification,
  notifySwapProposal,
  notifySwapAccepted,
  notifyNewMessage,
  notifyNewReview,
  notifyPaymentSuccess,
  notifyListingApproved,
  notifySubscriptionExpiring,
  sendBulkNotifications,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
  deleteNotification,
  clearAllNotifications
};