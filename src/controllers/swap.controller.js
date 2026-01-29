/**
 * Swap Controller - Prisma Implementation
 * Handles vehicle and parts swap operations
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get user's all swaps
 * @route   GET /api/v1/swaps
 * @access  Private
 */
exports.getUserSwaps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [swaps, total] = await Promise.all([
    prisma.swap.findMany({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      skip,
      take: parseInt(limit),
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
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            rating: true
          }
        },
        offeredVehicle: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
            images: true,
            price: true
          }
        }
      }
    }),
    prisma.swap.count({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ]
      }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: swaps.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { swaps }
  });
});

/**
 * @desc    Get swap statistics
 * @route   GET /api/v1/swaps/stats
 * @access  Private
 */
exports.getSwapStats = asyncHandler(async (req, res) => {
  const [pending, active, completed, rejected] = await Promise.all([
    prisma.swap.count({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ],
        status: 'pending'
      }
    }),
    prisma.swap.count({
      where: {
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ],
        status: 'accepted'
      }
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
        OR: [
          { initiatorId: req.user.id },
          { receiverId: req.user.id }
        ],
        status: 'rejected'
      }
    })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        pending,
        active,
        completed,
        rejected,
        total: pending + active + completed + rejected
      }
    }
  });
});

/**
 * @desc    Get pending swaps
 * @route   GET /api/v1/swaps/pending
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
          rating: true,
          reviewCount: true
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
 * @desc    Get active swaps
 * @route   GET /api/v1/swaps/active
 * @access  Private
 */
exports.getActiveSwaps = asyncHandler(async (req, res) => {
  const swaps = await prisma.swap.findMany({
    where: {
      OR: [
        { initiatorId: req.user.id },
        { receiverId: req.user.id }
      ],
      status: 'accepted'
    },
    orderBy: { updatedAt: 'desc' },
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
      receiver: {
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
 * @desc    Get completed swaps
 * @route   GET /api/v1/swaps/completed
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

/**
 * @desc    Get single swap by ID
 * @route   GET /api/v1/swaps/:swapId
 * @access  Private
 */
exports.getSwapById = asyncHandler(async (req, res) => {
  const { swapId } = req.params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      initiator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          rating: true,
          reviewCount: true,
          verificationBadges: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          rating: true,
          reviewCount: true,
          verificationBadges: true
        }
      },
      offeredVehicle: true
    }
  });

  if (!swap) {
    return res.status(404).json({
      status: 'error',
      message: 'Swap not found'
    });
  }

  // Verify user is part of the swap
  if (swap.initiatorId !== req.user.id && swap.receiverId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to view this swap'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { swap }
  });
});

/**
 * @desc    Propose a swap
 * @route   POST /api/v1/swaps/propose
 * @access  Private
 */
exports.proposeSwap = asyncHandler(async (req, res) => {
  const {
    offeredVehicleId,
    requestedItemType,
    requestedItemId,
    message,
    additionalCash,
    currency
  } = req.body;

  // Validate offered vehicle belongs to user
  const offeredVehicle = await prisma.vehicle.findUnique({
    where: { id: offeredVehicleId },
    select: { sellerId: true }
  });

  if (!offeredVehicle || offeredVehicle.sellerId !== req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid offered vehicle'
    });
  }

  // Get requested item and receiver
  let receiverId;
  if (requestedItemType === 'vehicle') {
    const requestedVehicle = await prisma.vehicle.findUnique({
      where: { id: requestedItemId },
      select: { sellerId: true }
    });
    
    if (!requestedVehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Requested vehicle not found'
      });
    }
    
    receiverId = requestedVehicle.sellerId;
  }

  // Can't swap with yourself
  if (receiverId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot propose swap with yourself'
    });
  }

  const swap = await prisma.swap.create({
    data: {
      initiatorId: req.user.id,
      receiverId,
      offeredVehicleId,
      requestedItemType,
      requestedItemId,
      message,
      additionalCash: additionalCash ? parseFloat(additionalCash) : 0,
      currency: currency || 'USD',
      status: 'pending'
    },
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

  // Create notification for receiver
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: 'swap_request',
      title: 'New Swap Proposal',
      message: `You have a new swap proposal from ${req.user.firstName}`,
      data: {
        swapId: swap.id,
        initiatorId: req.user.id
      }
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Swap proposal sent successfully',
    data: { swap }
  });
});

/**
 * @desc    Check swap ownership middleware
 */
exports.checkSwapOwnership = asyncHandler(async (req, res, next) => {
  const { swapId } = req.params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    select: { initiatorId: true, receiverId: true }
  });

  if (!swap) {
    return res.status(404).json({
      status: 'error',
      message: 'Swap not found'
    });
  }

  if (swap.receiverId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized - only receiver can perform this action'
    });
  }

  next();
});

/**
 * @desc    Accept swap proposal
 * @route   PATCH /api/v1/swaps/:swapId/accept
 * @access  Private
 */
exports.acceptSwap = asyncHandler(async (req, res) => {
  const { swapId } = req.params;
  const { responseNote } = req.body;

  const swap = await prisma.swap.update({
    where: { id: swapId },
    data: {
      status: 'accepted',
      responseNote
    },
    include: {
      initiator: true,
      receiver: true,
      offeredVehicle: true
    }
  });

  // Create notification for initiator
  await prisma.notification.create({
    data: {
      userId: swap.initiatorId,
      type: 'swap_accepted',
      title: 'Swap Accepted',
      message: `Your swap proposal has been accepted by ${swap.receiver.firstName}`,
      data: {
        swapId: swap.id,
        receiverId: swap.receiverId
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Swap accepted successfully',
    data: { swap }
  });
});

/**
 * @desc    Reject swap proposal
 * @route   PATCH /api/v1/swaps/:swapId/reject
 * @access  Private
 */
exports.rejectSwap = asyncHandler(async (req, res) => {
  const { swapId } = req.params;
  const { responseNote } = req.body;

  const swap = await prisma.swap.update({
    where: { id: swapId },
    data: {
      status: 'rejected',
      responseNote
    },
    include: {
      initiator: true,
      receiver: true
    }
  });

  // Create notification for initiator
  await prisma.notification.create({
    data: {
      userId: swap.initiatorId,
      type: 'swap_rejected',
      title: 'Swap Declined',
      message: `Your swap proposal has been declined`,
      data: {
        swapId: swap.id
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Swap rejected',
    data: { swap }
  });
});

/**
 * @desc    Counter offer
 * @route   POST /api/v1/swaps/:swapId/counter
 * @access  Private
 */
exports.counterOffer = asyncHandler(async (req, res) => {
  const { swapId } = req.params;
  const { additionalCash, message } = req.body;

  // TODO: Implement counter offer logic
  // This might involve creating a new swap or updating the existing one

  res.status(200).json({
    status: 'success',
    message: 'Counter offer sent'
  });
});

/**
 * @desc    Cancel swap
 * @route   PATCH /api/v1/swaps/:swapId/cancel
 * @access  Private
 */
exports.cancelSwap = asyncHandler(async (req, res) => {
  const { swapId } = req.params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    select: { initiatorId: true, receiverId: true, status: true }
  });

  if (!swap) {
    return res.status(404).json({
      status: 'error',
      message: 'Swap not found'
    });
  }

  // Only initiator or receiver can cancel
  if (swap.initiatorId !== req.user.id && swap.receiverId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to cancel this swap'
    });
  }

  // Can't cancel completed swaps
  if (swap.status === 'completed') {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot cancel completed swap'
    });
  }

  await prisma.swap.update({
    where: { id: swapId },
    data: { status: 'cancelled' }
  });

  // Notify the other party
  const otherUserId = swap.initiatorId === req.user.id ? swap.receiverId : swap.initiatorId;
  await prisma.notification.create({
    data: {
      userId: otherUserId,
      type: 'system',
      title: 'Swap Cancelled',
      message: 'A swap has been cancelled',
      data: { swapId }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Swap cancelled'
  });
});

/**
 * @desc    Complete swap
 * @route   PATCH /api/v1/swaps/:swapId/complete
 * @access  Private
 */
exports.completeSwap = asyncHandler(async (req, res) => {
  const { swapId } = req.params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    select: {
      initiatorId: true,
      receiverId: true,
      status: true,
      offeredVehicleId: true,
      requestedItemId: true,
      requestedItemType: true
    }
  });

  if (!swap) {
    return res.status(404).json({
      status: 'error',
      message: 'Swap not found'
    });
  }

  // Only parties involved can complete
  if (swap.initiatorId !== req.user.id && swap.receiverId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized'
    });
  }

  // Must be accepted first
  if (swap.status !== 'accepted') {
    return res.status(400).json({
      status: 'error',
      message: 'Swap must be accepted before completion'
    });
  }

  // Update swap status
  await prisma.swap.update({
    where: { id: swapId },
    data: {
      status: 'completed',
      completedAt: new Date()
    }
  });

  // Update vehicles as swapped
  if (swap.offeredVehicleId) {
    await prisma.vehicle.update({
      where: { id: swap.offeredVehicleId },
      data: { status: 'swapped' }
    });
  }

  if (swap.requestedItemType === 'vehicle') {
    await prisma.vehicle.update({
      where: { id: swap.requestedItemId },
      data: { status: 'swapped' }
    });
  }

  // Update user stats
  await Promise.all([
    prisma.user.update({
      where: { id: swap.initiatorId },
      data: { totalSwaps: { increment: 1 } }
    }),
    prisma.user.update({
      where: { id: swap.receiverId },
      data: { totalSwaps: { increment: 1 } }
    })
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Swap completed successfully'
  });
});

/**
 * @desc    Add swap note
 * @route   POST /api/v1/swaps/:swapId/notes
 * @access  Private
 */
exports.addSwapNote = asyncHandler(async (req, res) => {
  // TODO: Implement swap notes/comments system
  res.status(200).json({
    status: 'success',
    message: 'Note added'
  });
});

/**
 * @desc    Update swap status
 * @route   PATCH /api/v1/swaps/:swapId/status
 * @access  Private
 */
exports.updateSwapStatus = asyncHandler(async (req, res) => {
  const { swapId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status'
    });
  }

  await prisma.swap.update({
    where: { id: swapId },
    data: { status }
  });

  res.status(200).json({
    status: 'success',
    message: 'Swap status updated'
  });
});

/**
 * @desc    Report swap issue
 * @route   POST /api/v1/swaps/:swapId/report
 * @access  Private
 */
exports.reportSwapIssue = asyncHandler(async (req, res) => {
  const { swapId } = req.params;
  const { reason, description } = req.body;

  await prisma.report.create({
    data: {
      reporterId: req.user.id,
      itemType: 'swap',
      itemId: swapId,
      reason,
      description
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Swap issue reported successfully'
  });
});

/**
 * @desc    Get swap history
 * @route   GET /api/v1/swaps/:swapId/history
 * @access  Private
 */
exports.getSwapHistory = asyncHandler(async (req, res) => {
  // TODO: Implement swap history tracking
  res.status(200).json({
    status: 'success',
    data: { history: [] }
  });
});

/**
 * @desc    Get swap recommendations
 * @route   GET /api/v1/swaps/recommendations/:itemType/:itemId
 * @access  Private
 */
exports.getSwapRecommendations = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.params;

  // TODO: Implement AI-based swap recommendations
  // For now, return empty array
  res.status(200).json({
    status: 'success',
    data: { recommendations: [] }
  });
});

// Legacy exports for backward compatibility
exports.createSwap = exports.proposeSwap;
exports.getMySwaps = exports.getUserSwaps;
exports.getSwap = exports.getSwapById;
exports.respondToSwap = exports.acceptSwap;
