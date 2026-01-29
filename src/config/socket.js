/**
 * Socket.IO Configuration
 * Real-time chat and notifications
 */

const jwt = require('jsonwebtoken');

const configureSocketIO = (io) => {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Join chat room
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User ${socket.userId} left chat ${chatId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, message } = data;
        
        // Emit to all users in the chat room
        io.to(`chat_${chatId}`).emit('new_message', {
          chatId,
          message,
          senderId: socket.userId,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        userId: socket.userId,
        chatId
      });
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_stop_typing', {
        userId: socket.userId,
        chatId
      });
    });

    // Mark messages as read
    socket.on('mark_read', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('messages_read', {
        userId: socket.userId,
        chatId
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

// Helper function to send notification to specific user
const sendNotificationToUser = (io, userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

// Helper function to send message to chat
const sendMessageToChat = (io, chatId, message) => {
  io.to(`chat_${chatId}`).emit('new_message', message);
};

module.exports = {
  configureSocketIO,
  sendNotificationToUser,
  sendMessageToChat
};
