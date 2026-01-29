/**
 * User Controller - Prisma Implementation
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Profile Routes

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      city: true,
      region: true,
      country: true,
      address: true,
      role: true,
      accountType: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      isIDVerified: true,
      verificationBadges: true,
      rating: true,
      reviewCount: true,
      totalSales: true,
      totalSwaps: true,
      totalListings: true,
      subscriptionPlan: true,
      subscriptionIsActive: true,
      notificationEmail: true,
      notificationPush: true,
      notificationSms: true,
      language: true,
      currency: true,
      createdAt: true,
      lastLogin: true
    }
  });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    bio,
    phone,
    city,
    region,
    country,
    address
  } = req.body;

  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (username) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (phone) updateData.phone = phone;
  if (city) updateData.city = city;
  if (region) updateData.region = region;
  if (country) updateData.country = country;
  if (address) updateData.address = address;

  // Check if username is already taken
  if (username && username !== req.user.username) {
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Username already taken'
      });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      bio: true,
      phone: true,
      city: true,
      region: true,
      country: true,
      address: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Update user avatar
 * @route   PUT /api/v1/users/profile/avatar
 * @access  Private
 */
exports.updateAvatar = asyncHandler(async (req, res) => {
  // TODO: Handle file upload with multer and cloudinary
  const { avatarUrl, avatarPublicId } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      avatarUrl,
      avatarPublicId
    },
    select: {
      id: true,
      avatarUrl: true,
      avatarPublicId: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Avatar updated successfully',
    data: { user }
  });
});

/**
 * @desc    Delete user avatar
 * @route   DELETE /api/v1/users/profile/avatar
 * @access  Private
 */
exports.deleteAvatar = asyncHandler(async (req, res) => {
  // TODO: Delete from cloudinary if avatarPublicId exists

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      avatarUrl: null,
      avatarPublicId: null
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Avatar deleted successfully'
  });
});

// User Statistics

/**
 * @desc    Get user statistics
 * @route   GET /api/v1/users/stats
 * @access  Private
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const [
    activeListings,
    soldListings,
    totalSwaps,
    pendingSwaps,
    receivedReviews,
    totalFavorites
  ] = await Promise.all([
    prisma.vehicle.count({
      where: { sellerId: req.user.id, status: 'active' }
    }),
    prisma.vehicle.count({
      where: { sellerId: req.user.id, status: 'sold' }
    }),
    prisma.swap.count({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ],
        status: 'completed'
      }
    }),
    prisma.swap.count({
      where: {
        receiverId: req.user.id,
        status: 'pending'
      }
    }),
    prisma.review.count({
      where: { reviewedUserId: req.user.id }
    }),
    prisma.favorite.count({
      where: { userId: req.user.id }
    })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        activeListings,
        soldListings,
        totalSwaps,
        pendingSwaps,
        receivedReviews,
        totalFavorites
      }
    }
  });
});

// User Listings

/**
 * @desc    Get user's all listings
 * @route   GET /api/v1/users/listings
 * @access  Private
 */
exports.getUserListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [listings, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: { sellerId: req.user.id },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { favorites: true }
        }
      }
    }),
    prisma.vehicle.count({
      where: { sellerId: req.user.id }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: listings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { listings }
  });
});

/**
 * @desc    Get user's active listings
 * @route   GET /api/v1/users/listings/active
 * @access  Private
 */
exports.getActiveListings = asyncHandler(async (req, res) => {
  const listings = await prisma.vehicle.findMany({
    where: {
      sellerId: req.user.id,
      status: 'active'
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { favorites: true }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: { listings }
  });
});

/**
 * @desc    Get user's sold listings
 * @route   GET /api/v1/users/listings/sold
 * @access  Private
 */
exports.getSoldListings = asyncHandler(async (req, res) => {
  const listings = await prisma.vehicle.findMany({
    where: {
      sellerId: req.user.id,
      status: { in: ['sold', 'swapped'] }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: { listings }
  });
});

// User Swaps

/**
 * @desc    Get user's all swaps
 * @route   GET /api/v1/users/swaps
 * @access  Private
 */
exports.getUserSwaps = asyncHandler(async (req, res) => {
  const swaps = await prisma.swap.findMany({
    where: {
      OR: [
        { initiatorId: req.user.id },
        { receiverId: req.user.id }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      initiator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      offeredVehicle: {
        select: {
          id: true,
          title: true,
          make: true,
          model: true,
          year: true,
          images: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: swaps.length,
    data: { swaps }
  });
});

/**
 * @desc    Get user's pending swaps
 * @route   GET /api/v1/users/swaps/pending
 * @access  Private
 */
exports.getPendingSwaps = asyncHandler(async (req, res) => {
  const swaps = await prisma.swap.findMany({
    where: {
      receiverId: req.user.id,
      status: 'pending'
    },
    orderBy: { createdAt: 'desc' },
    include: {
      initiator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      },
      offeredVehicle: true
    }
  });

  res.status(200).json({
    status: 'success',
    results: swaps.length,
    data: { swaps }
  });
});

/**
 * @desc    Get user's completed swaps
 * @route   GET /api/v1/users/swaps/completed
 * @access  Private
 */
exports.getCompletedSwaps = asyncHandler(async (req, res) => {
  const swaps = await prisma.swap.findMany({
    where: {
      OR: [
        { initiatorId: req.user.id },
        { receiverId: req.user.id }
      ],
      status: 'completed'
    },
    orderBy: { completedAt: 'desc' },
    include: {
      initiator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      offeredVehicle: true
    }
  });

  res.status(200).json({
    status: 'success',
    results: swaps.length,
    data: { swaps }
  });
});

// Favorites/Wishlist

/**
 * @desc    Get user's favorites
 * @route   GET /api/v1/users/favorites
 * @access  Private
 */
exports.getFavorites = asyncHandler(async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: {
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              rating: true
            }
          }
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: favorites.length,
    data: { favorites }
  });
});

/**
 * @desc    Add item to favorites
 * @route   POST /api/v1/users/favorites/:itemType/:itemId
 * @access  Private
 */
exports.addToFavorites = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.params;

  if (itemType !== 'vehicle') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid item type'
    });
  }

  // Check if already favorited
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_vehicleId: {
        userId: req.user.id,
        vehicleId: itemId
      }
    }
  });

  if (existing) {
    return res.status(400).json({
      status: 'error',
      message: 'Already in favorites'
    });
  }

  const favorite = await prisma.favorite.create({
    data: {
      userId: req.user.id,
      vehicleId: itemId
    },
    include: {
      vehicle: true
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Added to favorites',
    data: { favorite }
  });
});

/**
 * @desc    Remove item from favorites
 * @route   DELETE /api/v1/users/favorites/:itemType/:itemId
 * @access  Private
 */
exports.removeFromFavorites = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.params;

  if (itemType !== 'vehicle') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid item type'
    });
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_vehicleId: {
        userId: req.user.id,
        vehicleId: itemId
      }
    }
  });

  if (!favorite) {
    return res.status(404).json({
      status: 'error',
      message: 'Favorite not found'
    });
  }

  await prisma.favorite.delete({
    where: { id: favorite.id }
  });

  res.status(200).json({
    status: 'success',
    message: 'Removed from favorites'
  });
});

// Saved Searches

/**
 * @desc    Get saved searches
 * @route   GET /api/v1/users/saved-searches
 * @access  Private
 */
exports.getSavedSearches = asyncHandler(async (req, res) => {
  const searches = await prisma.savedSearch.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: searches.length,
    data: { searches }
  });
});

/**
 * @desc    Create saved search
 * @route   POST /api/v1/users/saved-searches
 * @access  Private
 */
exports.createSavedSearch = asyncHandler(async (req, res) => {
  const { name, criteria, notifyOnNewListings } = req.body;

  const search = await prisma.savedSearch.create({
    data: {
      userId: req.user.id,
      name,
      criteria,
      notifyOnNewListings: notifyOnNewListings !== false
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Saved search created',
    data: { search }
  });
});

/**
 * @desc    Delete saved search
 * @route   DELETE /api/v1/users/saved-searches/:searchId
 * @access  Private
 */
exports.deleteSavedSearch = asyncHandler(async (req, res) => {
  const { searchId } = req.params;

  const search = await prisma.savedSearch.findUnique({
    where: { id: searchId }
  });

  if (!search || search.userId !== req.user.id) {
    return res.status(404).json({
      status: 'error',
      message: 'Saved search not found'
    });
  }

  await prisma.savedSearch.delete({
    where: { id: searchId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Saved search deleted'
  });
});

// Notifications

/**
 * @desc    Get notifications
 * @route   GET /api/v1/users/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({
      where: { userId: req.user.id }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { notifications }
  });
});

/**
 * @desc    Get unread notifications
 * @route   GET /api/v1/users/notifications/unread
 * @access  Private
 */
exports.getUnreadNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: req.user.id,
      isRead: false
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: { notifications }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/users/notifications/:notificationId/read
 * @access  Private
 */
exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.userId !== req.user.id) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found'
    });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/users/notifications/read-all
 * @access  Private
 */
exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user.id,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/users/notifications/:notificationId
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.userId !== req.user.id) {
    return res.status(404).json({
      status: 'error',
      message: 'Notification not found'
    });
  }

  await prisma.notification.delete({
    where: { id: notificationId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted'
  });
});

// Preferences

/**
 * @desc    Get user preferences
 * @route   GET /api/v1/users/preferences
 * @access  Private
 */
exports.getPreferences = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      notificationEmail: true,
      notificationPush: true,
      notificationSms: true,
      language: true,
      currency: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: { preferences: user }
  });
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/v1/users/preferences
 * @access  Private
 */
exports.updatePreferences = asyncHandler(async (req, res) => {
  const {
    notificationEmail,
    notificationPush,
    notificationSms,
    language,
    currency
  } = req.body;

  const updateData = {};
  if (typeof notificationEmail !== 'undefined') updateData.notificationEmail = notificationEmail;
  if (typeof notificationPush !== 'undefined') updateData.notificationPush = notificationPush;
  if (typeof notificationSms !== 'undefined') updateData.notificationSms = notificationSms;
  if (language) updateData.language = language;
  if (currency) updateData.currency = currency;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      notificationEmail: true,
      notificationPush: true,
      notificationSms: true,
      language: true,
      currency: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Preferences updated',
    data: { preferences: user }
  });
});

// Reviews

/**
 * @desc    Get all user reviews
 * @route   GET /api/v1/users/reviews
 * @access  Private
 */
exports.getUserReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        { reviewedUserId: req.user.id },
        { reviewerId: req.user.id }
      ]
    },
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      reviewedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

/**
 * @desc    Get received reviews
 * @route   GET /api/v1/users/reviews/received
 * @access  Private
 */
exports.getReceivedReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { reviewedUserId: req.user.id },
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

/**
 * @desc    Get given reviews
 * @route   GET /api/v1/users/reviews/given
 * @access  Private
 */
exports.getGivenReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { reviewerId: req.user.id },
    include: {
      reviewedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

// Payment History

/**
 * @desc    Get payment history
 * @route   GET /api/v1/users/payments
 * @access  Private
 */
exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: req.user.id },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.payment.count({
      where: { userId: req.user.id }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: payments.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { payments }
  });
});

// Subscription

/**
 * @desc    Get subscription details
 * @route   GET /api/v1/users/subscription
 * @access  Private
 */
exports.getSubscription = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      subscriptionPlan: true,
      subscriptionIsActive: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      featuredListings: true,
      boostedAds: true,
      prioritySupport: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: { subscription: user }
  });
});

/**
 * @desc    Upgrade subscription
 * @route   POST /api/v1/users/subscription/upgrade
 * @access  Private
 */
exports.upgradeSubscription = asyncHandler(async (req, res) => {
  const { plan } = req.body;

  // TODO: Integrate with payment gateway

  res.status(200).json({
    status: 'success',
    message: 'Subscription upgrade initiated',
    data: { plan }
  });
});

/**
 * @desc    Cancel subscription
 * @route   POST /api/v1/users/subscription/cancel
 * @access  Private
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      subscriptionIsActive: false
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled'
  });
});

// Security

/**
 * @desc    Change password
 * @route   PUT /api/v1/users/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide current and new password'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({
      status: 'error',
      message: 'Current password is incorrect'
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date()
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

/**
 * @desc    Verify email
 * @route   POST /api/v1/users/verify-email
 * @access  Private
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // TODO: Implement email verification logic

  res.status(200).json({
    status: 'success',
    message: 'Email verification initiated'
  });
});

/**
 * @desc    Verify phone
 * @route   POST /api/v1/users/verify-phone
 * @access  Private
 */
exports.verifyPhone = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // TODO: Implement phone verification logic

  res.status(200).json({
    status: 'success',
    message: 'Phone verification initiated'
  });
});

/**
 * @desc    Request verification badge
 * @route   POST /api/v1/users/request-verification
 * @access  Private
 */
exports.requestVerification = asyncHandler(async (req, res) => {
  const { type, documents } = req.body;

  // TODO: Implement verification request logic

  res.status(200).json({
    status: 'success',
    message: 'Verification request submitted'
  });
});

// Account Management

/**
 * @desc    Delete account
 * @route   DELETE /api/v1/users/account
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Password is required to delete account'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      status: 'error',
      message: 'Incorrect password'
    });
  }

  await prisma.user.delete({
    where: { id: req.user.id }
  });

  res.status(200).json({
    status: 'success',
    message: 'Account deleted successfully'
  });
});

/**
 * @desc    Deactivate account
 * @route   POST /api/v1/users/account/deactivate
 * @access  Private
 */
exports.deactivateAccount = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      isActive: false,
      accountStatus: 'suspended'
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Account deactivated'
  });
});

/**
 * @desc    Reactivate account
 * @route   POST /api/v1/users/account/reactivate
 * @access  Private
 */
exports.reactivateAccount = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      isActive: true,
      accountStatus: 'active'
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Account reactivated'
  });
});

// Admin Routes

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, accountStatus } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (role) where.role = role;
  if (accountStatus) where.accountStatus = accountStatus;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatarUrl: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        totalListings: true,
        rating: true,
        createdAt: true,
        lastLogin: true
      }
    }),
    prisma.user.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { users }
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:userId
 * @access  Private
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      city: true,
      region: true,
      country: true,
      role: true,
      accountType: true,
      rating: true,
      reviewCount: true,
      totalSales: true,
      totalSwaps: true,
      totalListings: true,
      verificationBadges: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * @desc    Ban user (Admin)
 * @route   PUT /api/v1/users/:userId/ban
 * @access  Private/Admin
 */
exports.banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason, duration } = req.body;

  const banExpires = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'banned',
      isActive: false,
      banReason: reason,
      banExpires
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'User banned successfully'
  });
});

/**
 * @desc    Unban user (Admin)
 * @route   PUT /api/v1/users/:userId/unban
 * @access  Private/Admin
 */
exports.unbanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'active',
      isActive: true,
      banReason: null,
      banExpires: null
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully'
  });
});

/**
 * @desc    Update user role (Admin)
 * @route   PUT /api/v1/users/:userId/role
 * @access  Private/Admin
 */
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'dealer', 'admin'].includes(role)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role'
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });

  res.status(200).json({
    status: 'success',
    message: 'User role updated successfully'
  });
});

/**
 * @desc    Delete user (Admin)
 * @route   DELETE /api/v1/users/:userId
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await prisma.user.delete({
    where: { id: userId }
  });

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});
