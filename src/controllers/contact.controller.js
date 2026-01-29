const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { sendEmail } = require('../services/email.service');

/**
 * @desc    Create new support message (Live chat or contact form)
 * @route   POST /api/v1/contact/support
 * @access  Public
 */
exports.createSupportMessage = asyncHandler(async (req, res) => {
  const { message, userName, userEmail, userPhone, type, category } = req.body;

  // Validation
  if (!message || !userName || !userEmail) {
    throw new ApiError(400, 'Message, name, and email are required');
  }

  // Get user info from request if authenticated
  const userId = req.user?.id || null;
  
  // Get IP and user agent
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');

  // Create support message using Prisma
  const supportMessage = await prisma.supportMessage.create({
    data: {
      userId,
      userName,
      userEmail,
      userPhone,
      message,
      type: type || 'live_chat',
      category: category || 'general',
      ipAddress,
      userAgent,
      metadata: {
        source: 'live_chat_widget',
        timestamp: new Date().toISOString(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Send email notification to admin
  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'tchabeustephane@gmail.com',
      subject: `🔔 New ${type || 'Support'} Message - ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📬 New Support Message</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Contact Information</h2>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${userName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${userEmail}" style="color: #2563eb;">${userEmail}</a></p>
              ${userPhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${userPhone}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Type:</strong> <span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${type || 'live_chat'}</span></p>
              <p style="margin: 5px 0;"><strong>Category:</strong> <span style="background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${category || 'general'}</span></p>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💬 Message:</h3>
              <p style="color: #451a03; white-space: pre-wrap; line-height: 1.6; margin: 0;">${message}</p>
            </div>

            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; font-size: 13px; color: #64748b;"><strong>Message ID:</strong> ${supportMessage.id}</p>
              <p style="margin: 5px 0; font-size: 13px; color: #64748b;"><strong>Received:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' })} (Cameroon Time)</p>
              <p style="margin: 5px 0; font-size: 13px; color: #64748b;"><strong>IP:</strong> ${ipAddress}</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <a href="mailto:${userEmail}?subject=Re: Your SwapRide Support Message" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📧 Reply to Customer
              </a>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                View all support messages in your admin dashboard
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding: 15px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              SwapRide Support System | Tiko, Cameroon<br/>
              📞 +237 679 398 551 | 📧 tchabeustephane@gmail.com
            </p>
          </div>
        </div>
      `,
      replyTo: userEmail,
    });
    
    console.log('✅ Support notification email sent to admin');
  } catch (emailError) {
    console.error('❌ Failed to send support notification email:', emailError.message);
    // Don't throw error - message is still saved
  }

  // Send auto-reply email to user
  try {
    await sendEmail({
      to: userEmail,
      subject: '✅ We received your message - SwapRide Support',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚗 SwapRide</h1>
            <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">Thank you for contacting us!</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin: 0 0 20px 0;">Hi ${userName}! 👋</h2>
            
            <p style="color: #475569; line-height: 1.8; margin-bottom: 20px;">
              We've successfully received your message and our team will get back to you as soon as possible. 
            </p>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="color: #64748b; margin: 0 0 10px 0; font-size: 13px; font-weight: bold;">YOUR MESSAGE:</p>
              <p style="color: #334155; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">📞 Need Immediate Help?</h3>
              <p style="color: #1e40af; margin: 0 0 10px 0;">Contact us directly:</p>
              <p style="color: #1e40af; margin: 5px 0;">
                <strong>WhatsApp:</strong> <a href="https://wa.me/237679398551" style="color: #15803d; text-decoration: none; font-weight: bold;">+237 679 398 551</a>
              </p>
              <p style="color: #1e40af; margin: 5px 0;">
                <strong>Email:</strong> <a href="mailto:tchabeustephane@gmail.com" style="color: #2563eb;">tchabeustephane@gmail.com</a>
              </p>
              <p style="color: #1e40af; margin: 5px 0;">
                <strong>Location:</strong> Tiko, Cameroon
              </p>
            </div>

            <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              Reference ID: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${supportMessage.id}</code>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">SwapRide - Buy, Sell & Swap Vehicles in Cameroon</p>
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} SwapRide. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Auto-reply email sent to user');
  } catch (emailError) {
    console.error('❌ Failed to send auto-reply email:', emailError.message);
  }

  res.status(201).json(
    new ApiResponse(201, {
      message: supportMessage,
    }, 'Support message sent successfully. We will respond shortly.')
  );
});

/**
 * @desc    Get all support messages (Admin only)
 * @route   GET /api/v1/contact/support
 * @access  Private/Admin
 */
exports.getAllSupportMessages = asyncHandler(async (req, res) => {
  const { status, type, category, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (category) where.category = category;

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.supportMessage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: parseInt(limit),
    }),
    prisma.supportMessage.count({ where }),
  ]);

  res.json(
    new ApiResponse(200, {
      messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    })
  );
});

/**
 * @desc    Get single support message
 * @route   GET /api/v1/contact/support/:id
 * @access  Private/Admin
 */
exports.getSupportMessage = asyncHandler(async (req, res) => {
  const message = await prisma.supportMessage.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!message) {
    throw new ApiError(404, 'Support message not found');
  }

  // Mark as read
  if (!message.isRead) {
    await prisma.supportMessage.update({
      where: { id: req.params.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  res.json(new ApiResponse(200, { message }));
});

/**
 * @desc    Update support message status
 * @route   PATCH /api/v1/contact/support/:id/status
 * @access  Private/Admin
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, priority, assignedToId } = req.body;

  const message = await prisma.supportMessage.findUnique({
    where: { id: req.params.id },
  });

  if (!message) {
    throw new ApiError(404, 'Support message not found');
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (priority) updateData.priority = priority;
  if (assignedToId) updateData.assignedToId = assignedToId;

  const updatedMessage = await prisma.supportMessage.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      user: true,
      assignedTo: true,
    },
  });

  res.json(
    new ApiResponse(200, { message: updatedMessage }, 'Status updated successfully')
  );
});

/**
 * @desc    Add admin response
 * @route   POST /api/v1/contact/support/:id/respond
 * @access  Private/Admin
 */
exports.respondToMessage = asyncHandler(async (req, res) => {
  const { response } = req.body;

  if (!response) {
    throw new ApiError(400, 'Response is required');
  }

  const message = await prisma.supportMessage.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!message) {
    throw new ApiError(404, 'Support message not found');
  }

  // Update message with response
  const updatedMessage = await prisma.supportMessage.update({
    where: { id: req.params.id },
    data: {
      adminResponse: response,
      respondedAt: new Date(),
      status: 'resolved',
      notes: {
        push: {
          adminId: req.user.id,
          note: `Response sent: ${response.substring(0, 100)}...`,
          createdAt: new Date().toISOString(),
        },
      },
    },
  });

  // Send response email to user
  try {
    await sendEmail({
      to: message.userEmail,
      subject: '📬 Response to Your SwapRide Support Message',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">SwapRide Support</h1>
          </div>
          <div style="background: white; padding: 30px;">
            <h2>Hi ${message.userName}!</h2>
            <p>We've responded to your support message:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Your message:</p>
              <p style="margin: 0 0 20px 0;">${message.message}</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Our response:</p>
              <p style="margin: 0;">${response}</p>
            </div>
            <p>If you have any more questions, feel free to reply to this email!</p>
            <p style="margin-top: 30px;">Best regards,<br>SwapRide Support Team</p>
          </div>
        </div>
      `,
      replyTo: process.env.ADMIN_EMAIL || 'tchabeustephane@gmail.com',
    });
  } catch (emailError) {
    console.error('Failed to send response email:', emailError);
  }

  res.json(
    new ApiResponse(200, { message: updatedMessage }, 'Response sent successfully')
  );
});

/**
 * @desc    Get support messages stats
 * @route   GET /api/v1/contact/support/stats
 * @access  Private/Admin
 */
exports.getSupportStats = asyncHandler(async (req, res) => {
  const [total, pending, inProgress, resolved, closed] = await Promise.all([
    prisma.supportMessage.count(),
    prisma.supportMessage.count({ where: { status: 'pending' } }),
    prisma.supportMessage.count({ where: { status: 'in_progress' } }),
    prisma.supportMessage.count({ where: { status: 'resolved' } }),
    prisma.supportMessage.count({ where: { status: 'closed' } }),
  ]);

  const stats = {
    total,
    pending,
    inProgress,
    resolved,
    closed,
    resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : '0',
  };

  res.json(new ApiResponse(200, { stats }));
});

/**
 * @desc    Get user's support messages
 * @route   GET /api/v1/contact/support/my-messages
 * @access  Private
 */
exports.getMyMessages = asyncHandler(async (req, res) => {
  const messages = await prisma.supportMessage.findMany({
    where: { userId: req.user.id },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      message: true,
      type: true,
      category: true,
      status: true,
      priority: true,
      adminResponse: true,
      respondedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(new ApiResponse(200, { messages }));
});
