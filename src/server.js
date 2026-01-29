/**
 * SwapRide Backend Server - Neon PostgreSQL Edition
 * Enterprise Vehicle Marketplace Platform
 * 
 * Main server entry point with Express.js, Socket.IO, Prisma, and comprehensive middleware
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');

// Import Prisma client
const prisma = require('./config/prisma');

// Import configurations
const { connectRedis } = require('./config/redis');
const { configureSocketIO } = require('./config/socket');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { securityMiddleware } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const partRoutes = require('./routes/part.routes');
const swapRoutes = require('./routes/swap.routes');
const chatRoutes = require('./routes/chat.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const contactRoutes = require('./routes/contact.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io instance globally for access in controllers
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(securityMiddleware);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'success',
      message: 'SwapRide API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Redirect /admin to /api/v1/admin for convenience
app.get('/admin*', (req, res) => {
  const newPath = req.path.replace('/admin', `${API_PREFIX}/admin`);
  res.redirect(newPath);
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
app.use(`${API_PREFIX}/parts`, partRoutes);
app.use(`${API_PREFIX}/swaps`, swapRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/uploads`, uploadRoutes);
app.use(`${API_PREFIX}/contact`, contactRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Configure Socket.IO
configureSocketIO(io);

// Test database connection
const testDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Neon PostgreSQL connected successfully');
    
    // Optional: Log database info
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Database version:', result[0]?.version?.split(' ')[0] || 'PostgreSQL');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to Neon PostgreSQL
    await testDatabaseConnection();

    // Connect to Redis (optional)
    try {
      await connectRedis();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️  Redis connection failed (optional):', error.message);
      console.warn('⚠️  Continuing without Redis...');
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║     🚗 SwapRide API Server Running    ║
╠════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}║
║  Port:        ${PORT.toString().padEnd(24)}║
║  API Version: ${(process.env.API_VERSION || 'v1').padEnd(24)}║
║  Database:    Neon PostgreSQL         ║
║  ORM:         Prisma                  ║
╚════════════════════════════════════════╝

🌐 Server URL: http://localhost:${PORT}
📡 API Base:   http://localhost:${PORT}/api/v1
🏥 Health:     http://localhost:${PORT}/health

📚 Docs: See MIGRATION_COMPLETE.md for next steps
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure you have created a Neon database');
    console.error('   2. Check that DATABASE_URL is set in .env');
    console.error('   3. Run: npx prisma generate');
    console.error('   4. Run: npx prisma migrate dev --name init');
    console.error('\n📚 See MIGRATION_COMPLETE.md for detailed setup instructions\n');
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    prisma.$disconnect();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('💥 Process terminated!');
  });
});

// Graceful shutdown on CTRL+C
process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT RECEIVED. Shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
