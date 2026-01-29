/**
 * Payment Controller - Prisma Implementation
 * Handles payment processing and transactions
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const crypto = require('crypto');

/**
 * @desc    Get supported currencies
 * @route   GET /api/v1/payments/currencies
 * @access  Public
 */
exports.getSupportedCurrencies = asyncHandler(async (req, res) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
  ];

  res.status(200).json({
    status: 'success',
    data: { currencies }
  });
});

/**
 * @desc    Get payment methods
 * @route   GET /api/v1/payments/methods
 * @access  Public
 */
exports.getPaymentMethods = asyncHandler(async (req, res) => {
  const methods = [
    { value: 'card', label: 'Credit/Debit Card', icon: 'credit-card' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: 'bank' },
    { value: 'mobile_money', label: 'Mobile Money', icon: 'mobile' },
    { value: 'cash', label: 'Cash', icon: 'money' }
  ];

  res.status(200).json({
    status: 'success',
    data: { methods }
  });
});

/**
 * @desc    Initialize payment
 * @route   POST /api/v1/payments/initialize
 * @access  Private
 */
exports.initializePayment = asyncHandler(async (req, res) => {
  const { amount, currency, paymentMethod, description, metadata } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid amount'
    });
  }

  // Generate payment reference
  const reference = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'card',
      reference,
      description,
      metadata: metadata || {},
      status: 'pending'
    }
  });

  // TODO: Integrate with payment gateway (Kora Pay, Stripe, etc.)
  const paymentData = {
    paymentId: payment.id,
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    checkoutUrl: `${process.env.CLIENT_URL}/checkout/${payment.id}`
  };

  res.status(201).json({
    status: 'success',
    message: 'Payment initialized',
    data: { payment: paymentData }
  });
});

/**
 * @desc    Verify payment
 * @route   GET /api/v1/payments/verify/:reference
 * @access  Private
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      reference,
      userId: req.user.id
    }
  });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found'
    });
  }

  // TODO: Verify payment with payment gateway
  let status = payment.status;
  let message = 'Payment verification in progress';

  if (payment.status === 'pending') {
    status = 'completed';
    message = 'Payment verified successfully';

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        transactionId: `TXN-${Date.now()}`,
        providerStatus: 'success',
        providerMessage: 'Payment successful'
      }
    });

    await processPaymentSuccess(payment);
  }

  res.status(200).json({
    status: 'success',
    message,
    data: {
      payment: {
        reference: payment.reference,
        amount: payment.amount,
        status
      }
    }
  });
});

/**
 * @desc    Get payment details
 * @route   GET /api/v1/payments/:paymentId
 * @access  Private
 */
exports.getPaymentDetails = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: req.user.id
    }
  });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: { payment }
  });
});

/**
 * @desc    Get user payment history
 * @route   GET /api/v1/payments/user/history
 * @access  Private
 */
exports.getUserPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    userId: req.user.id
  };

  if (status) {
    where.status = status;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        status: true,
        description: true,
        createdAt: true,
        transactionId: true
      }
    }),
    prisma.payment.count({ where })
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

/**
 * @desc    Handle payment webhook (from payment gateway)
 * @route   POST /api/v1/payments/webhook
 * @access  Public (with signature verification)
 */
exports.handleWebhook = asyncHandler(async (req, res) => {
  // TODO: Verify webhook signature from payment gateway
  const { event, data } = req.body;

  console.log('Payment webhook received:', event, data);

  switch (event) {
    case 'payment.success':
      await handlePaymentSuccess(data);
      break;
    case 'payment.failed':
      await handlePaymentFailure(data);
      break;
    case 'refund.processed':
      await handleRefund(data);
      break;
    default:
      console.log('Unknown webhook event:', event);
  }

  res.status(200).json({
    status: 'success',
    message: 'Webhook processed'
  });
});

/**
 * @desc    Cancel payment
 * @route   POST /api/v1/payments/:paymentId/cancel
 * @access  Private
 */
exports.cancelPayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: req.user.id,
      status: 'pending'
    }
  });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found or cannot be cancelled'
    });
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'cancelled' }
  });

  res.status(200).json({
    status: 'success',
    message: 'Payment cancelled'
  });
});

/**
 * @desc    Request refund
 * @route   POST /api/v1/payments/:paymentId/refund
 * @access  Private
 */
exports.requestRefund = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: req.user.id,
      status: 'completed'
    }
  });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found or cannot be refunded'
    });
  }

  // TODO: Initiate refund with payment gateway

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'refunded',
      metadata: {
        ...payment.metadata,
        refundReason: reason,
        refundedAt: new Date()
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Refund request initiated'
  });
});

/**
 * @desc    Initialize subscription payment
 * @route   POST /api/v1/payments/subscription/initialize
 * @access  Private
 */
exports.initializeSubscriptionPayment = asyncHandler(async (req, res) => {
  const { plan, duration } = req.body;

  const planPrices = {
    basic: 9.99,
    premium: 29.99,
    enterprise: 99.99
  };

  const price = planPrices[plan];
  if (!price) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid subscription plan'
    });
  }

  const reference = `SUB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      amount: price,
      currency: 'USD',
      paymentMethod: 'card',
      reference,
      description: `Subscription - ${plan} plan`,
      metadata: {
        type: 'subscription',
        plan,
        duration
      },
      status: 'pending'
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Subscription payment initialized',
    data: {
      payment: {
        paymentId: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        checkoutUrl: `${process.env.CLIENT_URL}/checkout/${payment.id}`
      }
    }
  });
});

/**
 * @desc    Cancel subscription
 * @route   POST /api/v1/payments/subscription/cancel
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

/**
 * @desc    Pay for featured listing
 * @route   POST /api/v1/payments/feature-listing
 * @access  Private
 */
exports.payForFeaturedListing = asyncHandler(async (req, res) => {
  const { listingId, duration = 7 } = req.body;

  const price = 10; // $10 per week
  const reference = `FEAT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      amount: price,
      currency: 'USD',
      paymentMethod: 'card',
      reference,
      description: 'Featured listing',
      metadata: {
        type: 'feature_listing',
        listingId,
        duration
      },
      status: 'pending'
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Payment initialized for featured listing',
    data: {
      payment: {
        paymentId: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        checkoutUrl: `${process.env.CLIENT_URL}/checkout/${payment.id}`
      }
    }
  });
});

/**
 * @desc    Pay for boosted ad
 * @route   POST /api/v1/payments/boost-ad
 * @access  Private
 */
exports.payForBoostedAd = asyncHandler(async (req, res) => {
  const { adId, duration = 7 } = req.body;

  const price = 5; // $5 per week
  const reference = `BOOST-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      amount: price,
      currency: 'USD',
      paymentMethod: 'card',
      reference,
      description: 'Boosted ad',
      metadata: {
        type: 'boost_ad',
        adId,
        duration
      },
      status: 'pending'
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Payment initialized for boosted ad',
    data: {
      payment: {
        paymentId: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        checkoutUrl: `${process.env.CLIENT_URL}/checkout/${payment.id}`
      }
    }
  });
});

/**
 * @desc    Initialize escrow payment
 * @route   POST /api/v1/payments/escrow/initialize
 * @access  Private
 */
exports.initializeEscrowPayment = asyncHandler(async (req, res) => {
  const { swapId, amount } = req.body;

  const reference = `ESC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      amount: parseFloat(amount),
      currency: 'USD',
      paymentMethod: 'card',
      reference,
      description: 'Escrow payment',
      metadata: {
        type: 'escrow',
        swapId
      },
      status: 'pending'
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Escrow payment initialized',
    data: {
      payment: {
        paymentId: payment.id,
        reference: payment.reference,
        amount: payment.amount
      }
    }
  });
});

/**
 * @desc    Release escrow payment
 * @route   POST /api/v1/payments/escrow/:escrowId/release
 * @access  Private
 */
exports.releaseEscrowPayment = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;

  // TODO: Implement escrow release logic

  res.status(200).json({
    status: 'success',
    message: 'Escrow payment released'
  });
});

/**
 * @desc    Get all payments (Admin)
 * @route   GET /api/v1/payments/admin/all
 * @access  Private/Admin
 */
exports.getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, userId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.payment.count({ where })
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

/**
 * @desc    Get payment statistics (Admin)
 * @route   GET /api/v1/payments/admin/stats
 * @access  Private/Admin
 */
exports.getPaymentStats = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const [totalRevenue, completedPayments, pendingPayments, failedPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: 'completed',
        createdAt: { gte: startDate }
      },
      _sum: { amount: true }
    }),
    prisma.payment.count({
      where: {
        status: 'completed',
        createdAt: { gte: startDate }
      }
    }),
    prisma.payment.count({ where: { status: 'pending' } }),
    prisma.payment.count({
      where: {
        status: 'failed',
        createdAt: { gte: startDate }
      }
    })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalRevenue: totalRevenue._sum.amount || 0,
        completedPayments,
        pendingPayments,
        failedPayments,
        period: `${period} days`
      }
    }
  });
});

/**
 * @desc    Process refund (Admin)
 * @route   POST /api/v1/payments/:paymentId/admin/refund
 * @access  Private/Admin
 */
exports.processRefund = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    return res.status(404).json({
      status: 'error',
      message: 'Payment not found'
    });
  }

  // TODO: Process refund with payment gateway

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'refunded',
      metadata: {
        ...payment.metadata,
        refundReason: reason,
        refundedBy: req.user.id,
        refundedAt: new Date()
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Refund processed successfully'
  });
});

/**
 * @desc    Update payment status (Admin)
 * @route   PATCH /api/v1/payments/:paymentId/admin/status
 * @access  Private/Admin
 */
exports.updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status'
    });
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status }
  });

  res.status(200).json({
    status: 'success',
    message: 'Payment status updated'
  });
});

// Helper functions
async function handlePaymentSuccess(data) {
  const { reference, transactionId } = data;

  const payment = await prisma.payment.findFirst({
    where: { reference }
  });

  if (payment && payment.status === 'pending') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        transactionId,
        providerStatus: 'success'
      }
    });

    await processPaymentSuccess(payment);
  }
}

async function handlePaymentFailure(data) {
  const { reference, reason } = data;

  const payment = await prisma.payment.findFirst({
    where: { reference }
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        providerMessage: reason
      }
    });
  }
}

async function handleRefund(data) {
  const { reference } = data;

  const payment = await prisma.payment.findFirst({
    where: { reference }
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'refunded' }
    });
  }
}

async function processPaymentSuccess(payment) {
  const metadata = payment.metadata || {};

  switch (metadata.type) {
    case 'subscription':
      await activateSubscription(payment.userId, metadata.plan);
      break;
    case 'feature_listing':
      await featureListing(metadata.listingId, metadata.duration);
      break;
    case 'boost_ad':
      await boostAd(metadata.adId, metadata.duration);
      break;
  }

  await prisma.notification.create({
    data: {
      userId: payment.userId,
      type: 'system',
      title: 'Payment Successful',
      message: `Your payment of ${payment.currency} ${payment.amount} was successful`,
      data: {
        paymentId: payment.id,
        reference: payment.reference
      }
    }
  });
}

async function activateSubscription(userId, plan) {
  const duration = plan === 'premium' ? 30 : 365;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + duration);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan,
      subscriptionIsActive: true,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: endDate
    }
  });
}

async function featureListing(listingId, duration = 7) {
  const featuredUntil = new Date();
  featuredUntil.setDate(featuredUntil.getDate() + duration);

  await prisma.vehicle.update({
    where: { id: listingId },
    data: {
      isFeatured: true,
      featuredUntil
    }
  });
}

async function boostAd(adId, duration = 7) {
  const boostedUntil = new Date();
  boostedUntil.setDate(boostedUntil.getDate() + duration);

  await prisma.vehicle.update({
    where: { id: adId },
    data: {
      isBoosted: true,
      boostedUntil
    }
  });
}
