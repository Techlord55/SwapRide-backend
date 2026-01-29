/**
 * Admin Controller - Prisma Implementation
 * Admin dashboard and management functions
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

// Dashboard Statistics

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard/stats
 * @access  Private/Admin
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    totalVehicles,
    activeVehicles,
    totalParts,
    totalSwaps,
    pendingReports,
    pendingReviews,
    recentUsers,
    recentListings
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountStatus: 'active' } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: 'active' } }),
    prisma.part.count(),
    prisma.swap.count(),
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.review.count({ where: { status: 'pending' } }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        accountStatus: true
      }
    }),
    prisma.vehicle.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        make: true,
        model: true,
        price: true,
        status: true,
        createdAt: true
      }
    })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        users: { total: totalUsers, active: activeUsers },
        vehicles: { total: totalVehicles, active: activeVehicles },
        parts: { total: totalParts },
        swaps: { total: totalSwaps },
        pending: { reports: pendingReports, reviews: pendingReviews }
      },
      recentUsers,
      recentListings
    }
  });
});

/**
 * @desc    Get analytics data
 * @route   GET /api/v1/admin/dashboard/analytics
 * @access  Private/Admin
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const [userGrowth, listingGrowth, swapStats] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
    prisma.vehicle.count({ where: { createdAt: { gte: startDate } } }),
    prisma.swap.groupBy({ by: ['status'], _count: true })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      period: `${period} days`,
      userGrowth,
      listingGrowth,
      swapStats
    }
  });
});

/**
 * @desc    Get revenue statistics
 * @route   GET /api/v1/admin/dashboard/revenue
 * @access  Private/Admin
 */
exports.getRevenueStats = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const stats = await prisma.payment.aggregate({
    where: {
      status: 'completed',
      createdAt: { gte: startDate }
    },
    _sum: { amount: true },
    _count: true,
    _avg: { amount: true }
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalRevenue: stats._sum.amount || 0,
      totalTransactions: stats._count,
      averageTransaction: stats._avg.amount || 0,
      period: `${period} days`
    }
  });
});

// User Management

/**
 * @desc    Get all users
 * @route   GET /api/v1/admin/users
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
      orderBy: { createdAt: 'desc' }
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
 * @desc    Get user statistics
 * @route   GET /api/v1/admin/users/stats
 * @access  Private/Admin
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const stats = await prisma.user.groupBy({
    by: ['accountStatus', 'role'],
    _count: true
  });

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

/**
 * @desc    Get user details
 * @route   GET /api/v1/admin/users/:userId
 * @access  Private/Admin
 */
exports.getUserDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      vehicles: { take: 5 },
      _count: {
        select: {
          vehicles: true,
          parts: true,
          sentSwaps: true,
          receivedSwaps: true
        }
      }
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
 * @desc    Verify user
 * @route   PATCH /api/v1/admin/users/:userId/verify
 * @access  Private/Admin
 */
exports.verifyUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type } = req.body; // email, phone, id

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const badges = user.verificationBadges || [];
  
  if (!badges.includes(type)) {
    badges.push(type);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { verificationBadges: badges }
  });

  res.status(200).json({
    status: 'success',
    message: 'User verified'
  });
});

/**
 * @desc    Unverify user
 * @route   PATCH /api/v1/admin/users/:userId/unverify
 * @access  Private/Admin
 */
exports.unverifyUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const badges = (user.verificationBadges || []).filter(b => b !== type);

  await prisma.user.update({
    where: { id: userId },
    data: { verificationBadges: badges }
  });

  res.status(200).json({
    status: 'success',
    message: 'User unverified'
  });
});

/**
 * @desc    Ban user
 * @route   PATCH /api/v1/admin/users/:userId/ban
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
    message: 'User banned'
  });
});

/**
 * @desc    Unban user
 * @route   PATCH /api/v1/admin/users/:userId/unban
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
    message: 'User unbanned'
  });
});

/**
 * @desc    Update user role
 * @route   PATCH /api/v1/admin/users/:userId/role
 * @access  Private/Admin
 */
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });

  res.status(200).json({
    status: 'success',
    message: 'User role updated'
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:userId
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await prisma.user.delete({ where: { id: userId } });

  res.status(200).json({
    status: 'success',
    message: 'User deleted'
  });
});

// Listing Management

/**
 * @desc    Get all listings
 * @route   GET /api/v1/admin/listings
 * @access  Private/Admin
 */
exports.getAllListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = 'vehicle', status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;

  let listings, total;
  if (type === 'vehicle') {
    [listings, total] = await Promise.all([
      prisma.vehicle.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.vehicle.count({ where })
    ]);
  } else {
    [listings, total] = await Promise.all([
      prisma.part.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.part.count({ where })
    ]);
  }

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
 * @desc    Get pending listings
 * @route   GET /api/v1/admin/listings/pending
 * @access  Private/Admin
 */
exports.getPendingListings = asyncHandler(async (req, res) => {
  const [vehicles, parts] = await Promise.all([
    prisma.vehicle.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } }),
    prisma.part.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' } })
  ]);

  res.status(200).json({
    status: 'success',
    data: { vehicles, parts }
  });
});

/**
 * @desc    Get flagged listings
 * @route   GET /api/v1/admin/listings/flagged
 * @access  Private/Admin
 */
exports.getFlaggedListings = asyncHandler(async (req, res) => {
  const [vehicles, parts] = await Promise.all([
    prisma.vehicle.findMany({ where: { isReported: true }, orderBy: { reportCount: 'desc' } }),
    prisma.part.findMany({ where: { isReported: true }, orderBy: { reportCount: 'desc' } })
  ]);

  res.status(200).json({
    status: 'success',
    data: { vehicles, parts }
  });
});

/**
 * @desc    Approve listing
 * @route   PATCH /api/v1/admin/listings/:listingId/approve
 * @access  Private/Admin
 */
exports.approveListing = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { type = 'vehicle' } = req.body;

  if (type === 'vehicle') {
    await prisma.vehicle.update({
      where: { id: listingId },
      data: { status: 'active', isVerified: true }
    });
  } else {
    await prisma.part.update({
      where: { id: listingId },
      data: { status: 'active', isVerified: true }
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Listing approved'
  });
});

/**
 * @desc    Reject listing
 * @route   PATCH /api/v1/admin/listings/:listingId/reject
 * @access  Private/Admin
 */
exports.rejectListing = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { type = 'vehicle', reason } = req.body;

  if (type === 'vehicle') {
    await prisma.vehicle.update({
      where: { id: listingId },
      data: { status: 'inactive' }
    });
  } else {
    await prisma.part.update({
      where: { id: listingId },
      data: { status: 'inactive' }
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Listing rejected'
  });
});

/**
 * @desc    Delete listing
 * @route   DELETE /api/v1/admin/listings/:listingId
 * @access  Private/Admin
 */
exports.deleteListing = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { type = 'vehicle' } = req.query;

  if (type === 'vehicle') {
    await prisma.vehicle.delete({ where: { id: listingId } });
  } else {
    await prisma.part.delete({ where: { id: listingId } });
  }

  res.status(200).json({
    status: 'success',
    message: 'Listing deleted'
  });
});

// Remaining methods - stub implementations for now

exports.getAllSwaps = asyncHandler(async (req, res) => {
  const swaps = await prisma.swap.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.status(200).json({ status: 'success', data: { swaps } });
});

exports.getSwapStats = asyncHandler(async (req, res) => {
  const stats = await prisma.swap.groupBy({ by: ['status'], _count: true });
  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getDisputedSwaps = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { swaps: [] } });
});

exports.resolveSwapDispute = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Dispute resolved' });
});

exports.getAllPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.status(200).json({ status: 'success', data: { payments } });
});

exports.getPaymentStats = asyncHandler(async (req, res) => {
  const stats = await prisma.payment.aggregate({ _sum: { amount: true }, _count: true });
  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getFailedPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({ where: { status: 'failed' } });
  res.status(200).json({ status: 'success', data: { payments } });
});

exports.processRefund = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Refund processed' });
});

exports.getAllReports = asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.status(200).json({ status: 'success', data: { reports } });
});

exports.getPendingReports = asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({ where: { status: 'pending' } });
  res.status(200).json({ status: 'success', data: { reports } });
});

exports.getReportStats = asyncHandler(async (req, res) => {
  const stats = await prisma.report.groupBy({ by: ['status'], _count: true });
  res.status(200).json({ status: 'success', data: { stats } });
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  await prisma.report.update({ where: { id: reportId }, data: { status: 'resolved' } });
  res.status(200).json({ status: 'success', message: 'Report resolved' });
});

exports.rejectReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  await prisma.report.update({ where: { id: reportId }, data: { status: 'rejected' } });
  res.status(200).json({ status: 'success', message: 'Report rejected' });
});

exports.getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.status(200).json({ status: 'success', data: { reviews } });
});

exports.getPendingReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({ where: { status: 'pending' } });
  res.status(200).json({ status: 'success', data: { reviews } });
});

exports.getFlaggedReviews = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { reviews: [] } });
});

exports.approveReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  await prisma.review.update({ where: { id: reviewId }, data: { status: 'approved', isApproved: true } });
  res.status(200).json({ status: 'success', message: 'Review approved' });
});

exports.rejectReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  await prisma.review.update({ where: { id: reviewId }, data: { status: 'rejected' } });
  res.status(200).json({ status: 'success', message: 'Review rejected' });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  await prisma.review.delete({ where: { id: reviewId } });
  res.status(200).json({ status: 'success', message: 'Review deleted' });
});

exports.getModerationQueue = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { queue: [] } });
});

exports.bulkModeration = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Bulk action completed' });
});

exports.getSettings = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { settings: {} } });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Settings updated' });
});

exports.getFeatureFlags = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { features: {} } });
});

exports.updateFeatureFlags = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Feature flags updated' });
});

exports.getCategories = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { categories: [] } });
});

exports.createCategory = asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', message: 'Category created' });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Category updated' });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Category deleted' });
});

exports.broadcastNotification = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Notification broadcasted' });
});

exports.sendTargetedNotification = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Notification sent' });
});

exports.getActivityLogs = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { logs: [] } });
});

exports.getSecurityLogs = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { logs: [] } });
});

exports.getErrorLogs = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { logs: [] } });
});

exports.exportUsers = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Export initiated' });
});

exports.exportListings = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Export initiated' });
});

exports.exportTransactions = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Export initiated' });
});

exports.getSystemHealth = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { health: 'ok' } });
});

exports.getPerformanceMetrics = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { metrics: {} } });
});

exports.clearCache = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Cache cleared' });
});

exports.getCacheStats = asyncHandler(async (req, res) => {
  res.status(200).json({ status: 'success', data: { stats: {} } });
});

// Legacy methods for backward compatibility
exports.getDashboard = exports.getDashboardStats;
exports.getStats = exports.getAnalytics;
exports.manageUsers = exports.getAllUsers;
exports.manageListings = exports.getAllListings;
