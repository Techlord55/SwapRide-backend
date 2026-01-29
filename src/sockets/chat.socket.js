/**
 * Socket.IO Chat Handler
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Conversation = require('../models/Conversation');

module.exports = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);
    
    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);
    
    // Emit online status
    io.emit('user-online', { userId: socket.userId });

    /**
     * Join a conversation room
     */
    socket.on('join-conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }
        
        // Verify user is a participant
        const isParticipant = conversation.participants.some(
          p => p.toString() === socket.userId
        );
        
        if (!isParticipant) {
          return socket.emit('error', { message: 'Not authorized to join this conversation' });
        }
        
        socket.join(`conversation:${conversationId}`);
        socket.emit('joined-conversation', { conversationId });
        
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    /**
     * Leave a conversation room
     */
    socket.on('leave-conversation', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    /**
     * Send a message
     */
    socket.on('send-message', async (data) => {
      try {
        const { conversationId, content, type, fileUrl } = data;
        
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', 'firstName lastName avatar');
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }
        
        // Verify user is a participant
        const isParticipant = conversation.participants.some(
          p => p._id.toString() === socket.userId
        );
        
        if (!isParticipant) {
          return socket.emit('error', { message: 'Not authorized' });
        }
        
        // Add message to conversation
        const message = await conversation.addMessage(
          socket.userId,
          content,
          type || 'text',
          fileUrl
        );
        
        // Broadcast to all users in the conversation room
        io.to(`conversation:${conversationId}`).emit('new-message', {
          conversationId,
          message: {
            ...message.toObject(),
            sender: conversation.participants.find(
              p => p._id.toString() === socket.userId
            )
          }
        });
        
        // Send notification to recipient's personal room
        const recipientId = conversation.participants.find(
          p => p._id.toString() !== socket.userId
        );
        
        if (recipientId) {
          io.to(`user:${recipientId._id}`).emit('message-notification', {
            conversationId,
            message: {
              content,
              sender: {
                id: socket.userId,
                name: conversation.participants.find(
                  p => p._id.toString() === socket.userId
                )?.firstName
              }
            }
          });
        }
        
        console.log(`Message sent in conversation ${conversationId}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data;
      
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        userId: socket.userId,
        conversationId,
        isTyping
      });
    });

    /**
     * Mark messages as read
     */
    socket.on('mark-read', async (data) => {
      try {
        const { conversationId } = data;
        
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }
        
        await conversation.markAsRead(socket.userId);
        
        // Notify sender that messages were read
        io.to(`conversation:${conversationId}`).emit('messages-read', {
          conversationId,
          userId: socket.userId,
          readAt: new Date()
        });
        
        console.log(`Messages marked as read in conversation ${conversationId}`);
      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    /**
     * Get online users (for specific conversation)
     */
    socket.on('check-online', async (data) => {
      const { conversationId } = data;
      
      const socketsInRoom = await io.in(`conversation:${conversationId}`).fetchSockets();
      const onlineUserIds = socketsInRoom.map(s => s.userId);
      
      socket.emit('online-users', {
        conversationId,
        onlineUsers: onlineUserIds
      });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      
      // Emit offline status
      io.emit('user-offline', { userId: socket.userId });
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.IO chat handler initialized');
};
