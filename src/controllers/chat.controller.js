/**
 * Chat Controller - Prisma Implementation
 * Handles messaging and conversations
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get user's conversations
 * @route   GET /api/v1/chat/conversations
 * @access  Private
 */
exports.getConversations = asyncHandler(async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        has: req.user.id
      }
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      }
    }
  });

  // Get unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.chat.count({
        where: {
          conversationId: conv.id,
          receiverId: req.user.id,
          isRead: false
        }
      });

      // Get other participant info
      const otherParticipantId = conv.participants.find(id => id !== req.user.id);
      const otherParticipant = await prisma.user.findUnique({
        where: { id: otherParticipantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          isActive: true
        }
      });

      return {
        ...conv,
        unreadCount,
        otherParticipant
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: conversationsWithUnread.length,
    data: { conversations: conversationsWithUnread }
  });
});

/**
 * @desc    Get messages in a conversation
 * @route   GET /api/v1/chat/:conversationId/messages
 * @access  Private
 */
exports.getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: true }
  });

  if (!conversation) {
    return res.status(404).json({
      status: 'error',
      message: 'Conversation not found'
    });
  }

  if (!conversation.participants.includes(req.user.id)) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to view this conversation'
    });
  }

  const [messages, total] = await Promise.all([
    prisma.chat.findMany({
      where: { conversationId },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    }),
    prisma.chat.count({ where: { conversationId } })
  ]);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { messages: messages.reverse() }
  });
});

/**
 * @desc    Send message
 * @route   POST /api/v1/chat/:conversationId/messages
 * @access  Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { message, attachments } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Message cannot be empty'
    });
  }

  // Verify conversation exists and user is participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: true }
  });

  if (!conversation) {
    return res.status(404).json({
      status: 'error',
      message: 'Conversation not found'
    });
  }

  if (!conversation.participants.includes(req.user.id)) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized'
    });
  }

  // Get receiver ID (other participant)
  const receiverId = conversation.participants.find(id => id !== req.user.id);

  // Create message
  const chat = await prisma.chat.create({
    data: {
      conversationId,
      senderId: req.user.id,
      receiverId,
      message: message.trim(),
      attachments: attachments || []
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    }
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: message.trim(),
      lastMessageAt: new Date()
    }
  });

  // Create notification for receiver
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${req.user.firstName}`,
      data: {
        conversationId,
        senderId: req.user.id
      }
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Message sent',
    data: { chat }
  });
});

/**
 * @desc    Mark messages as read
 * @route   PATCH /api/v1/chat/:conversationId/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: true }
  });

  if (!conversation || !conversation.participants.includes(req.user.id)) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized'
    });
  }

  // Mark all unread messages in this conversation as read
  await prisma.chat.updateMany({
    where: {
      conversationId,
      receiverId: req.user.id,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Messages marked as read'
  });
});

/**
 * @desc    Create or get conversation
 * @route   POST /api/v1/chat/conversations
 * @access  Private
 */
exports.createConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID is required'
    });
  }

  if (userId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot create conversation with yourself'
    });
  }

  // Check if user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isActive: true
    }
  });

  if (!otherUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Check if conversation already exists
  const participants = [req.user.id, userId].sort();
  let conversation = await prisma.conversation.findFirst({
    where: {
      participants: { hasEvery: participants }
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      conversation: {
        ...conversation,
        otherParticipant: otherUser
      }
    }
  });
});

/**
 * @desc    Delete conversation
 * @route   DELETE /api/v1/chat/:conversationId
 * @access  Private
 */
exports.deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: true }
  });

  if (!conversation || !conversation.participants.includes(req.user.id)) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized'
    });
  }

  // Delete all messages first
  await prisma.chat.deleteMany({
    where: { conversationId }
  });

  // Delete conversation
  await prisma.conversation.delete({
    where: { id: conversationId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Conversation deleted'
  });
});

/**
 * @desc    Get unread message count
 * @route   GET /api/v1/chat/unread-count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.chat.count({
    where: {
      receiverId: req.user.id,
      isRead: false
    }
  });

  res.status(200).json({
    status: 'success',
    data: { unreadCount: count }
  });
});

/**
 * @desc    Delete message
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @access  Private
 */
exports.deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await prisma.chat.findUnique({
    where: { id: messageId },
    select: { senderId: true }
  });

  if (!message) {
    return res.status(404).json({
      status: 'error',
      message: 'Message not found'
    });
  }

  if (message.senderId !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to delete this message'
    });
  }

  await prisma.chat.delete({
    where: { id: messageId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Message deleted'
  });
});
