/**
 * SMS Service
 * Handles SMS notifications and phone verification using Twilio
 */

const twilio = require('twilio');
const { ApiError } = require('../utils/ApiError');

// Initialize Twilio client
let twilioClient;

/**
 * Initialize Twilio client
 */
const initializeTwilio = () => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn('⚠️  Twilio credentials not found. SMS features will be disabled.');
      return;
    }

    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
  } catch (error) {
    console.error('❌ Twilio initialization error:', error.message);
  }
};

/**
 * Send SMS message
 * @param {String} to - Recipient phone number (E.164 format)
 * @param {String} message - Message content
 * @returns {Promise<Object>} SMS result
 */
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    throw ApiError.serviceUnavailable('SMS service is not available');
  }

  try {
    // Ensure phone number is in E.164 format
    const formattedNumber = formatPhoneNumber(to);

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
      to: result.to
    };
  } catch (error) {
    console.error('SMS send error:', error);
    throw ApiError.internal(`Failed to send SMS: ${error.message}`);
  }
};

/**
 * Send verification code
 * @param {String} phoneNumber - Phone number
 * @param {String} code - Verification code
 * @returns {Promise<Object>} SMS result
 */
const sendVerificationCode = async (phoneNumber, code) => {
  const message = `Your SwapRide verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send OTP (One-Time Password)
 * @param {String} phoneNumber - Phone number
 * @param {String} otp - OTP code
 * @returns {Promise<Object>} SMS result
 */
const sendOTP = async (phoneNumber, otp) => {
  const message = `Your SwapRide OTP is: ${otp}. Valid for 5 minutes. Never share this with anyone.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send swap notification
 * @param {String} phoneNumber - Phone number
 * @param {String} swapDetails - Swap details
 * @returns {Promise<Object>} SMS result
 */
const sendSwapNotification = async (phoneNumber, swapDetails) => {
  const message = `SwapRide: ${swapDetails}. View details in the app.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send offer notification
 * @param {String} phoneNumber - Phone number
 * @param {String} offerDetails - Offer details
 * @returns {Promise<Object>} SMS result
 */
const sendOfferNotification = async (phoneNumber, offerDetails) => {
  const message = `SwapRide: New offer on your listing! ${offerDetails}. Check the app for details.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send message notification
 * @param {String} phoneNumber - Phone number
 * @param {String} senderName - Sender's name
 * @returns {Promise<Object>} SMS result
 */
const sendMessageNotification = async (phoneNumber, senderName) => {
  const message = `SwapRide: You have a new message from ${senderName}. Open the app to reply.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send payment confirmation
 * @param {String} phoneNumber - Phone number
 * @param {Number} amount - Payment amount
 * @param {String} reference - Payment reference
 * @returns {Promise<Object>} SMS result
 */
const sendPaymentConfirmation = async (phoneNumber, amount, reference) => {
  const message = `SwapRide: Payment of $${amount} confirmed. Reference: ${reference}. Thank you!`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send listing approved notification
 * @param {String} phoneNumber - Phone number
 * @param {String} listingTitle - Listing title
 * @returns {Promise<Object>} SMS result
 */
const sendListingApproved = async (phoneNumber, listingTitle) => {
  const message = `SwapRide: Your listing "${listingTitle}" has been approved and is now live!`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send listing rejected notification
 * @param {String} phoneNumber - Phone number
 * @param {String} listingTitle - Listing title
 * @param {String} reason - Rejection reason
 * @returns {Promise<Object>} SMS result
 */
const sendListingRejected = async (phoneNumber, listingTitle, reason) => {
  const message = `SwapRide: Your listing "${listingTitle}" was not approved. Reason: ${reason}. Contact support for help.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send account alert
 * @param {String} phoneNumber - Phone number
 * @param {String} alertType - Alert type
 * @param {String} details - Alert details
 * @returns {Promise<Object>} SMS result
 */
const sendAccountAlert = async (phoneNumber, alertType, details) => {
  const message = `SwapRide Security Alert: ${alertType}. ${details}. If this wasn't you, contact support immediately.`;
  return await sendSMS(phoneNumber, message);
};

/**
 * Send bulk SMS (for promotional messages)
 * @param {Array} recipients - Array of phone numbers
 * @param {String} message - Message content
 * @returns {Promise<Array>} Array of SMS results
 */
const sendBulkSMS = async (recipients, message) => {
  if (!twilioClient) {
    throw ApiError.serviceUnavailable('SMS service is not available');
  }

  try {
    const sendPromises = recipients.map(async (phoneNumber) => {
      try {
        return await sendSMS(phoneNumber, message);
      } catch (error) {
        return {
          success: false,
          to: phoneNumber,
          error: error.message
        };
      }
    });

    const results = await Promise.all(sendPromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      total: recipients.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    console.error('Bulk SMS error:', error);
    throw ApiError.internal('Failed to send bulk SMS');
  }
};

/**
 * Verify phone number format
 * @param {String} phoneNumber - Phone number to verify
 * @returns {Boolean} Is valid
 */
const verifyPhoneNumber = (phoneNumber) => {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Format phone number to E.164 format
 * @param {String} phoneNumber - Phone number
 * @param {String} countryCode - Country code (default: +237 for Cameroon)
 * @returns {String} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber, countryCode = '+237') => {
  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If already has country code
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // If starts with 0, remove it and add country code
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Add country code if not present
  if (!cleaned.startsWith(countryCode.replace('+', ''))) {
    return countryCode + cleaned;
  }

  return '+' + cleaned;
};

/**
 * Get SMS delivery status
 * @param {String} messageId - Twilio message SID
 * @returns {Promise<Object>} Message status
 */
const getSMSStatus = async (messageId) => {
  if (!twilioClient) {
    throw ApiError.serviceUnavailable('SMS service is not available');
  }

  try {
    const message = await twilioClient.messages(messageId).fetch();

    return {
      success: true,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
  } catch (error) {
    console.error('Get SMS status error:', error);
    throw ApiError.internal('Failed to get SMS status');
  }
};

/**
 * Get account balance
 * @returns {Promise<Object>} Account balance
 */
const getAccountBalance = async () => {
  if (!twilioClient) {
    throw ApiError.serviceUnavailable('SMS service is not available');
  }

  try {
    const account = await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

    return {
      success: true,
      balance: account.balance,
      currency: account.currency,
      status: account.status
    };
  } catch (error) {
    console.error('Get account balance error:', error);
    throw ApiError.internal('Failed to get account balance');
  }
};

// Initialize on module load
initializeTwilio();

module.exports = {
  initializeTwilio,
  sendSMS,
  sendVerificationCode,
  sendOTP,
  sendSwapNotification,
  sendOfferNotification,
  sendMessageNotification,
  sendPaymentConfirmation,
  sendListingApproved,
  sendListingRejected,
  sendAccountAlert,
  sendBulkSMS,
  verifyPhoneNumber,
  formatPhoneNumber,
  getSMSStatus,
  getAccountBalance
};