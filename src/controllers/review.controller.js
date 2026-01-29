/**
 * Review Controller - Prisma Implementation
 * Handles user and listing reviews
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Create review
 * @route   POST /api/v1/reviews
 * @access  Private
 */
exports.createReview = asyncHandler(async (req, res) => {
  const { reviewedUserId, vehicleId, rating, comment } = req.body;

  if (!reviewedUserId) {
    return res.status(400).json({
      status: 'error',
      message: 'Reviewed user ID is required'
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      status: 'error',
      message: 'Rating must be between 1 and 5'
    });
  }

  // Can't review yourself
  if (reviewedUserId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot review yourself'
    });
  }

  // Check if user exists
  const reviewedUser = await prisma.user.findUnique({
    where: { id: reviewedUserId }
  });

  if (!reviewedUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findFirst({
    where: {
      reviewerId: req.user.id,
      reviewedUserId,
      vehicleId: vehicleId || null
    }
  });

  if (existingReview) {
    return res.status(400).json({
      status: 'error',
      message: 'You have already reviewed this user for this transaction'
    });
  }

  // If vehicle specified, verify it exists
  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      reviewerId: req.user.id,
      reviewedUserId,
      vehicleId,
      rating: parseInt(rating),
      comment,
      status: 'pending'
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
      vehicle: {
        select: {
          id: true,
          title: true,
          make: true,
          model: true
        }
      }
    }
  });

  // Update user's rating
  await updateUserRating(reviewedUserId);

  // Create notification
  await prisma.notification.create({
    data: {
      userId: reviewedUserId,
      type: 'review_received',
      title: 'New Review',
      message: `${req.user.firstName} left you a review`,
      data: {
        reviewId: review.id,
        reviewerId: req.user.id,
        rating
      }
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully',
    data: { review }
  });
});

/**
 * @desc    Get reviews for a user
 * @route   GET /api/v1/reviews/user/:userId
 * @access  Public
 */
exports.getReviews = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20, status = 'approved' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    reviewedUserId: userId
  };

  if (status) {
    where.status = status;
  }

  const [reviews, total, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            verificationBadges: true
          }
        },
        vehicle: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true
          }
        }
      }
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where: { reviewedUserId: userId, status: 'approved' },
      _avg: { rating: true },
      _count: { rating: true }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats: {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating || 0
    },
    data: { reviews }
  });
});

/**
 * @desc    Get reviews for a vehicle
 * @route   GET /api/v1/reviews/vehicle/:vehicleId
 * @access  Public
 */
exports.getVehicleReviews = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        vehicleId,
        status: 'approved'
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    }),
    prisma.review.count({
      where: {
        vehicleId,
        status: 'approved'
      }
    })
  ]);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { reviews }
  });
});

/**
 * @desc    Update review
 * @route   PUT /api/v1/reviews/:reviewId
 * @access  Private (Owner)
 */
exports.updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;

  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { reviewerId: true, reviewedUserId: true }
  });

  if (!existingReview) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }

  if (existingReview.reviewerId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this review'
    });
  }

  const updateData = {};
  if (rating) {
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }
    updateData.rating = parseInt(rating);
  }
  if (comment !== undefined) updateData.comment = comment;
  updateData.status = 'pending'; // Reset to pending after edit

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    }
  });

  // Update user rating
  await updateUserRating(existingReview.reviewedUserId);

  res.status(200).json({
    status: 'success',
    message: 'Review updated successfully',
    data: { review }
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/v1/reviews/:reviewId
 * @access  Private (Owner)
 */
exports.deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { reviewerId: true, reviewedUserId: true }
  });

  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }

  if (review.reviewerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to delete this review'
    });
  }

  await prisma.review.delete({
    where: { id: reviewId }
  });

  // Update user rating
  await updateUserRating(review.reviewedUserId);

  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully'
  });
});

/**
 * @desc    Get my reviews (given)
 * @route   GET /api/v1/reviews/my/given
 * @access  Private
 */
exports.getMyGivenReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { reviewerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      vehicle: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

/**
 * @desc    Get my reviews (received)
 * @route   GET /api/v1/reviews/my/received
 * @access  Private
 */
exports.getMyReceivedReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { reviewedUserId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      },
      vehicle: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});

/**
 * @desc    Approve review (Admin)
 * @route   PATCH /api/v1/reviews/:reviewId/approve
 * @access  Private/Admin
 */
exports.approveReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: 'approved',
      isApproved: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Review approved',
    data: { review }
  });
});

/**
 * @desc    Reject review (Admin)
 * @route   PATCH /api/v1/reviews/:reviewId/reject
 * @access  Private/Admin
 */
exports.rejectReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reason } = req.body;

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: 'rejected',
      isApproved: false
    }
  });

  // TODO: Notify reviewer about rejection

  res.status(200).json({
    status: 'success',
    message: 'Review rejected',
    data: { review }
  });
});

/**
 * Helper function to update user rating
 */
async function updateUserRating(userId) {
  const stats = await prisma.review.aggregate({
    where: {
      reviewedUserId: userId,
      status: 'approved'
    },
    _avg: { rating: true },
    _count: { rating: true }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      rating: stats._avg.rating || 0,
      reviewCount: stats._count.rating || 0
    }
  });
}
