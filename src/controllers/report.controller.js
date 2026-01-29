/**
 * Report Controller - Prisma Implementation
 * Handles user reports and moderation
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Create report
 * @route   POST /api/v1/reports
 * @access  Private
 */
exports.createReport = asyncHandler(async (req, res) => {
  const { itemType, itemId, reason, description } = req.body;

  if (!itemType || !itemId || !reason) {
    return res.status(400).json({
      status: 'error',
      message: 'Item type, item ID, and reason are required'
    });
  }

  const validTypes = ['vehicle', 'part', 'user', 'swap', 'review'];
  if (!validTypes.includes(itemType)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid item type'
    });
  }

  // Verify item exists based on type
  let itemExists = false;
  switch (itemType) {
    case 'vehicle':
      itemExists = await prisma.vehicle.findUnique({ where: { id: itemId } });
      break;
    case 'part':
      itemExists = await prisma.part.findUnique({ where: { id: itemId } });
      break;
    case 'user':
      itemExists = await prisma.user.findUnique({ where: { id: itemId } });
      break;
    case 'swap':
      itemExists = await prisma.swap.findUnique({ where: { id: itemId } });
      break;
    case 'review':
      itemExists = await prisma.review.findUnique({ where: { id: itemId } });
      break;
  }

  if (!itemExists) {
    return res.status(404).json({
      status: 'error',
      message: 'Item not found'
    });
  }

  // Check if already reported by this user
  const existingReport = await prisma.report.findFirst({
    where: {
      reporterId: req.user.id,
      itemType,
      itemId,
      status: { not: 'resolved' }
    }
  });

  if (existingReport) {
    return res.status(400).json({
      status: 'error',
      message: 'You have already reported this item'
    });
  }

  // Create report
  const report = await prisma.report.create({
    data: {
      reporterId: req.user.id,
      itemType,
      itemId,
      reason,
      description,
      status: 'pending'
    },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  // Increment report count on the item
  if (itemType === 'vehicle') {
    await prisma.vehicle.update({
      where: { id: itemId },
      data: {
        isReported: true,
        reportCount: { increment: 1 }
      }
    });
  } else if (itemType === 'part') {
    await prisma.part.update({
      where: { id: itemId },
      data: {
        isReported: true,
        reportCount: { increment: 1 }
      }
    });
  }

  res.status(201).json({
    status: 'success',
    message: 'Report submitted successfully',
    data: { report }
  });
});

/**
 * @desc    Get all reports (Admin)
 * @route   GET /api/v1/reports
 * @access  Private/Admin
 */
exports.getReports = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    itemType,
    sortBy = '-createdAt'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (itemType) where.itemType = itemType;

  const orderBy = {};
  if (sortBy.startsWith('-')) {
    orderBy[sortBy.substring(1)] = 'desc';
  } else {
    orderBy[sortBy] = 'asc';
  }

  const [reports, total, stats] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy,
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    }),
    prisma.report.count({ where }),
    prisma.report.groupBy({
      by: ['status'],
      _count: true
    })
  ]);

  const statusStats = {};
  stats.forEach(stat => {
    statusStats[stat.status] = stat._count;
  });

  res.status(200).json({
    status: 'success',
    results: reports.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats: statusStats,
    data: { reports }
  });
});

/**
 * @desc    Get single report
 * @route   GET /api/v1/reports/:reportId
 * @access  Private/Admin
 */
exports.getReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  if (!report) {
    return res.status(404).json({
      status: 'error',
      message: 'Report not found'
    });
  }

  // Get reported item details
  let reportedItem = null;
  switch (report.itemType) {
    case 'vehicle':
      reportedItem = await prisma.vehicle.findUnique({
        where: { id: report.itemId },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      break;
    case 'part':
      reportedItem = await prisma.part.findUnique({
        where: { id: report.itemId },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      break;
    case 'user':
      reportedItem = await prisma.user.findUnique({
        where: { id: report.itemId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          accountStatus: true
        }
      });
      break;
  }

  res.status(200).json({
    status: 'success',
    data: {
      report,
      reportedItem
    }
  });
});

/**
 * @desc    Update report status (Admin)
 * @route   PATCH /api/v1/reports/:reportId
 * @access  Private/Admin
 */
exports.updateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, resolution } = req.body;

  const validStatuses = ['pending', 'reviewed', 'resolved'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status'
    });
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (resolution) updateData.resolution = resolution;
  if (status === 'resolved') updateData.resolvedAt = new Date();

  const report = await prisma.report.update({
    where: { id: reportId },
    data: updateData
  });

  res.status(200).json({
    status: 'success',
    message: 'Report updated successfully',
    data: { report }
  });
});

/**
 * @desc    Resolve report and take action (Admin)
 * @route   POST /api/v1/reports/:reportId/resolve
 * @access  Private/Admin
 */
exports.resolveReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action, resolution } = req.body;

  const report = await prisma.report.findUnique({
    where: { id: reportId }
  });

  if (!report) {
    return res.status(404).json({
      status: 'error',
      message: 'Report not found'
    });
  }

  // Take action based on report type and action requested
  switch (action) {
    case 'remove_item':
      await removeReportedItem(report);
      break;
    case 'ban_user':
      await banReportedUser(report);
      break;
    case 'suspend_item':
      await suspendReportedItem(report);
      break;
    case 'no_action':
      // Just mark as resolved
      break;
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action'
      });
  }

  // Update report
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'resolved',
      resolution: resolution || action,
      resolvedAt: new Date()
    }
  });

  // Notify reporter
  await prisma.notification.create({
    data: {
      userId: report.reporterId,
      type: 'system',
      title: 'Report Resolved',
      message: `Your report has been reviewed and resolved`,
      data: {
        reportId: report.id,
        action
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Report resolved and action taken'
  });
});

/**
 * @desc    Get my reports
 * @route   GET /api/v1/reports/my
 * @access  Private
 */
exports.getMyReports = asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { reporterId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: { reports }
  });
});

/**
 * @desc    Delete report (Admin)
 * @route   DELETE /api/v1/reports/:reportId
 * @access  Private/Admin
 */
exports.deleteReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  await prisma.report.delete({
    where: { id: reportId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Report deleted'
  });
});

/**
 * Helper: Remove reported item
 */
async function removeReportedItem(report) {
  switch (report.itemType) {
    case 'vehicle':
      await prisma.vehicle.update({
        where: { id: report.itemId },
        data: { status: 'inactive' }
      });
      break;
    case 'part':
      await prisma.part.update({
        where: { id: report.itemId },
        data: { status: 'inactive' }
      });
      break;
    case 'review':
      await prisma.review.update({
        where: { id: report.itemId },
        data: { status: 'rejected' }
      });
      break;
  }
}

/**
 * Helper: Ban reported user
 */
async function banReportedUser(report) {
  if (report.itemType === 'user') {
    await prisma.user.update({
      where: { id: report.itemId },
      data: {
        accountStatus: 'banned',
        isActive: false,
        banReason: `Banned due to report: ${report.reason}`
      }
    });
  }
}

/**
 * Helper: Suspend reported item
 */
async function suspendReportedItem(report) {
  switch (report.itemType) {
    case 'vehicle':
      await prisma.vehicle.update({
        where: { id: report.itemId },
        data: { status: 'pending' }
      });
      break;
    case 'part':
      await prisma.part.update({
        where: { id: report.itemId },
        data: { status: 'pending' }
      });
      break;
  }
}
