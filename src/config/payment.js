/**
 * Kora Payment Gateway Configuration
 * Payment processing for featured listings, subscriptions, and escrow
 */

const axios = require('axios');
const crypto = require('crypto');

const KORA_API_URL = process.env.KORA_API_URL || 'https://api.korapay.com/merchant/api/v1';
const KORA_PUBLIC_KEY = process.env.KORA_PUBLIC_KEY;
const KORA_SECRET_KEY = process.env.KORA_SECRET_KEY;
const KORA_ENCRYPTION_KEY = process.env.KORA_ENCRYPTION_KEY;

/**
 * Initialize payment with Kora
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} Payment initialization result
 */
const initializePayment = async (paymentData) => {
  try {
    const { amount, email, currency = 'NGN', metadata, reference } = paymentData;

    // Mock response for development (no real API credentials yet)
    if (process.env.NODE_ENV === 'development' || !KORA_SECRET_KEY) {
      return {
        success: true,
        data: {
          reference: reference || `SWAPRIDE_${Date.now()}`,
          authorizationUrl: `${process.env.FRONTEND_URL}/payment/mock?ref=${reference}`,
          accessCode: 'mock_access_code',
          status: 'pending'
        }
      };
    }

    // Real Kora API call
    const response = await axios.post(
      `${KORA_API_URL}/charges/initialize`,
      {
        reference,
        amount: amount * 100, // Convert to lowest currency unit
        currency,
        customer: {
          email
        },
        metadata,
        notification_url: `${process.env.BACKEND_URL}/api/v1/payments/webhook`,
        redirect_url: `${process.env.FRONTEND_URL}/payment/callback`
      },
      {
        headers: {
          'Authorization': `Bearer ${KORA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Kora payment initialization error:', error.response?.data || error.message);
    throw new Error('Failed to initialize payment');
  }
};

/**
 * Verify payment with Kora
 * @param {string} reference - Payment reference
 * @returns {Promise<Object>} Verification result
 */
const verifyPayment = async (reference) => {
  try {
    // Mock verification for development
    if (process.env.NODE_ENV === 'development' || !KORA_SECRET_KEY) {
      return {
        success: true,
        data: {
          reference,
          amount: 5000,
          currency: 'NGN',
          status: 'success',
          paidAt: new Date().toISOString()
        }
      };
    }

    // Real Kora API call
    const response = await axios.get(
      `${KORA_API_URL}/charges/${reference}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${KORA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Kora payment verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify payment');
  }
};

/**
 * Verify webhook signature
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @returns {boolean} Verification result
 */
const verifyWebhookSignature = (payload, signature) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      return true; // Skip verification in development
    }

    const hash = crypto
      .createHmac('sha512', process.env.KORA_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Create refund
 * @param {string} transactionId - Transaction ID
 * @param {number} amount - Amount to refund
 * @returns {Promise<Object>} Refund result
 */
const createRefund = async (transactionId, amount) => {
  try {
    // Mock refund for development
    if (process.env.NODE_ENV === 'development' || !KORA_SECRET_KEY) {
      return {
        success: true,
        data: {
          refundId: `REFUND_${Date.now()}`,
          status: 'success',
          amount
        }
      };
    }

    const response = await axios.post(
      `${KORA_API_URL}/refunds`,
      {
        transaction_id: transactionId,
        amount: amount * 100
      },
      {
        headers: {
          'Authorization': `Bearer ${KORA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Kora refund error:', error.response?.data || error.message);
    throw new Error('Failed to create refund');
  }
};

/**
 * Get payment details
 * @param {string} reference - Payment reference
 * @returns {Promise<Object>} Payment details
 */
const getPaymentDetails = async (reference) => {
  try {
    if (process.env.NODE_ENV === 'development' || !KORA_SECRET_KEY) {
      return {
        success: true,
        data: {
          reference,
          amount: 5000,
          status: 'success'
        }
      };
    }

    const response = await axios.get(
      `${KORA_API_URL}/charges/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${KORA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Get payment details error:', error.response?.data || error.message);
    throw new Error('Failed to get payment details');
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  createRefund,
  getPaymentDetails
};
