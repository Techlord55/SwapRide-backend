/**
 * Payment Service
 * Handles Kora payment gateway integration
 */

const axios = require('axios');
const { Payment } = require('../models');
const { generateReference } = require('../utils/helpers');

// Kora API Configuration
const KORA_API_URL = process.env.KORA_API_URL || 'https://api.korapay.com/merchant/api/v1';
const KORA_PUBLIC_KEY = process.env.KORA_PUBLIC_KEY;
const KORA_SECRET_KEY = process.env.KORA_SECRET_KEY;
const KORA_ENCRYPTION_KEY = process.env.KORA_ENCRYPTION_KEY;

// Create Kora API client
const koraClient = axios.create({
  baseURL: KORA_API_URL,
  headers: {
    'Authorization': `Bearer ${KORA_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Initialize payment
 * @param {object} paymentData - Payment initialization data
 * @returns {Promise<object>} Payment initialization response
 */
exports.initializePayment = async (paymentData) => {
  const {
    userId,
    amount,
    currency = 'USD',
    paymentType,
    metadata = {},
    customerEmail,
    customerName
  } = paymentData;

  try {
    // Generate unique reference
    const reference = generateReference('PAY');

    // Create payment record in database
    const payment = await Payment.create({
      user: userId,
      reference,
      amount,
      currency,
      paymentType,
      status: 'pending',
      paymentProvider: 'kora',
      metadata
    });

    // Initialize payment with Kora
    const koraPayload = {
      reference,
      amount,
      currency,
      customer: {
        email: customerEmail,
        name: customerName
      },
      notification_url: `${process.env.BACKEND_URL}/api/v1/payments/webhook`,
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      merchant_bears_cost: true,
      metadata: {
        ...metadata,
        payment_id: payment._id.toString()
      }
    };

    const response = await koraClient.post('/charges/initialize', koraPayload);

    if (response.data.status === true) {
      // Update payment with Kora response
      payment.metadata = {
        ...payment.metadata,
        kora_reference: response.data.data.reference,
        checkout_url: response.data.data.checkout_url
      };
      await payment.save();

      return {
        success: true,
        payment_id: payment._id,
        reference,
        checkout_url: response.data.data.checkout_url,
        message: 'Payment initialized successfully'
      };
    } else {
      throw new Error(response.data.message || 'Payment initialization failed');
    }
  } catch (error) {
    console.error('Kora payment initialization error:', error.response?.data || error.message);
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
};

/**
 * Verify payment
 * @param {string} reference - Payment reference
 * @returns {Promise<object>} Payment verification response
 */
exports.verifyPayment = async (reference) => {
  try {
    const response = await koraClient.get(`/charges/${reference}`);

    if (response.data.status === true) {
      const paymentData = response.data.data;

      // Update payment status in database
      const payment = await Payment.findOne({ reference });
      
      if (payment) {
        payment.status = paymentData.status === 'success' ? 'success' : 'failed';
        payment.paymentMethod = paymentData.payment_method;
        payment.paidAt = paymentData.status === 'success' ? new Date() : null;
        payment.metadata = {
          ...payment.metadata,
          kora_data: paymentData
        };
        await payment.save();

        return {
          success: true,
          payment,
          status: payment.status,
          message: 'Payment verified successfully'
        };
      } else {
        throw new Error('Payment record not found');
      }
    } else {
      throw new Error(response.data.message || 'Payment verification failed');
    }
  } catch (error) {
    console.error('Kora payment verification error:', error.response?.data || error.message);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

/**
 * Process payment webhook
 * @param {object} webhookData - Webhook payload from Kora
 * @returns {Promise<object>} Webhook processing response
 */
exports.processWebhook = async (webhookData) => {
  try {
    const { event, data } = webhookData;

    // Find payment by reference
    const payment = await Payment.findOne({
      $or: [
        { reference: data.reference },
        { 'metadata.kora_reference': data.reference }
      ]
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment based on event
    switch (event) {
      case 'charge.success':
        payment.status = 'success';
        payment.paidAt = new Date();
        payment.paymentMethod = data.payment_method;
        break;

      case 'charge.failed':
        payment.status = 'failed';
        break;

      case 'charge.pending':
        payment.status = 'pending';
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    payment.metadata = {
      ...payment.metadata,
      webhook_data: data,
      last_webhook_event: event,
      last_webhook_at: new Date()
    };

    await payment.save();

    return {
      success: true,
      payment,
      message: 'Webhook processed successfully'
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
};

/**
 * Refund payment
 * @param {string} reference - Payment reference
 * @param {number} amount - Amount to refund (optional, defaults to full amount)
 * @param {string} reason - Refund reason
 * @returns {Promise<object>} Refund response
 */
exports.refundPayment = async (reference, amount = null, reason = '') => {
  try {
    const payment = await Payment.findOne({ reference });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'success') {
      throw new Error('Only successful payments can be refunded');
    }

    const refundAmount = amount || payment.amount;

    const refundPayload = {
      reference: payment.metadata.kora_reference || reference,
      amount: refundAmount,
      reason
    };

    const response = await koraClient.post('/refunds', refundPayload);

    if (response.data.status === true) {
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.metadata = {
        ...payment.metadata,
        refund_data: response.data.data,
        refund_reason: reason
      };
      await payment.save();

      return {
        success: true,
        payment,
        message: 'Payment refunded successfully'
      };
    } else {
      throw new Error(response.data.message || 'Refund failed');
    }
  } catch (error) {
    console.error('Kora refund error:', error.response?.data || error.message);
    throw new Error(`Refund failed: ${error.message}`);
  }
};

/**
 * Get payment status
 * @param {string} reference - Payment reference
 * @returns {Promise<object>} Payment status
 */
exports.getPaymentStatus = async (reference) => {
  try {
    const payment = await Payment.findOne({ reference })
      .populate('user', 'firstName lastName email');

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      success: true,
      payment,
      status: payment.status
    };
  } catch (error) {
    throw new Error(`Failed to get payment status: ${error.message}`);
  }
};

/**
 * Get user payments
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} User payments
 */
exports.getUserPayments = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentType
  } = options;

  const query = { user: userId };
  if (status) query.status = status;
  if (paymentType) query.paymentType = paymentType;

  const payments = await Payment.find(query)
    .sort('-createdAt')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Payment.countDocuments(query);

  return {
    payments,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit))
  };
};

/**
 * Create featured listing payment
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @param {number} duration - Duration in days
 * @param {string} customerEmail - Customer email
 * @param {string} customerName - Customer name
 * @returns {Promise<object>} Payment initialization response
 */
exports.createFeaturedListingPayment = async (
  userId,
  listingId,
  duration,
  customerEmail,
  customerName
) => {
  // Calculate amount based on duration
  const pricePerDay = parseFloat(process.env.FEATURED_LISTING_PRICE_PER_DAY) || 5;
  const amount = pricePerDay * duration;

  return await exports.initializePayment({
    userId,
    amount,
    currency: 'USD',
    paymentType: 'featured_listing',
    metadata: {
      listing_id: listingId,
      duration,
      feature_type: 'featured'
    },
    customerEmail,
    customerName
  });
};

/**
 * Create boost listing payment
 * @param {string} userId - User ID
 * @param {string} listingId - Listing ID
 * @param {number} duration - Duration in days
 * @param {string} customerEmail - Customer email
 * @param {string} customerName - Customer name
 * @returns {Promise<object>} Payment initialization response
 */
exports.createBoostListingPayment = async (
  userId,
  listingId,
  duration,
  customerEmail,
  customerName
) => {
  const pricePerDay = parseFloat(process.env.BOOST_LISTING_PRICE_PER_DAY) || 3;
  const amount = pricePerDay * duration;

  return await exports.initializePayment({
    userId,
    amount,
    currency: 'USD',
    paymentType: 'boost',
    metadata: {
      listing_id: listingId,
      duration,
      feature_type: 'boost'
    },
    customerEmail,
    customerName
  });
};

/**
 * Create subscription payment
 * @param {string} userId - User ID
 * @param {string} planType - Subscription plan type
 * @param {number} amount - Amount
 * @param {string} customerEmail - Customer email
 * @param {string} customerName - Customer name
 * @returns {Promise<object>} Payment initialization response
 */
exports.createSubscriptionPayment = async (
  userId,
  planType,
  amount,
  customerEmail,
  customerName
) => {
  return await exports.initializePayment({
    userId,
    amount,
    currency: 'USD',
    paymentType: 'subscription',
    metadata: {
      plan_type: planType
    },
    customerEmail,
    customerName
  });
};

/**
 * Validate webhook signature (if Kora provides webhook signatures)
 * @param {object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @returns {boolean} True if valid
 */
exports.validateWebhookSignature = (payload, signature) => {
  // Implement signature validation based on Kora's webhook security
  // This is a placeholder - update based on Kora's actual implementation
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', KORA_ENCRYPTION_KEY || KORA_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
};

module.exports = exports;
