/**
 * Email Service - Fixed version with better error handling
 * Handles all email sending operations using Nodemailer
 */

let nodemailer;
let transporter;

// Try to load nodemailer
try {
  nodemailer = require('nodemailer');
  
  // Create transporter with better configuration
  if (nodemailer && nodemailer.createTransporter) {
    transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
      }
    });

    // Verify transporter configuration
    transporter.verify((error, success) => {
      if (error) {
        console.warn('⚠️  Email service configuration issue:', error.message);
        console.warn('⚠️  Please configure EMAIL_USER and EMAIL_PASSWORD in .env');
      } else {
        console.log('✅ Email service is ready');
      }
    });
  } else {
    console.warn('⚠️  Nodemailer not properly loaded');
    transporter = null;
  }
} catch (error) {
  console.warn('⚠️  Nodemailer not installed or failed to load:', error.message);
  console.warn('⚠️  Email functionality will be disabled');
  console.warn('⚠️  To enable emails, run: npm install nodemailer');
  transporter = null;
}

/**
 * Send email
 * @param {object} options - Email options
 * @returns {Promise<object>} Email send result
 */
exports.sendEmail = async (options) => {
  // If transporter is not configured, log warning and continue
  if (!transporter) {
    console.warn('⚠️  Email not sent (nodemailer not configured):', options.subject);
    return { 
      messageId: 'not-configured', 
      accepted: [options.to],
      note: 'Email service not configured' 
    };
  }

  const { to, subject, html, text, attachments, replyTo } = options;

  const mailOptions = {
    from: `${process.env.APP_NAME || 'SwapRide'} <${process.env.EMAIL_USER || 'noreply@swapride.com'}>`,
    to,
    subject,
    html,
    text,
    attachments,
    replyTo: replyTo || process.env.EMAIL_USER
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    // Don't throw error - just log it and continue
    return { 
      error: error.message,
      note: 'Email failed to send but operation continued'
    };
  }
};

module.exports = exports;
