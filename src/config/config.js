/**
 * Application Configuration
 * Central configuration management
 */

module.exports = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Server
  port: process.env.PORT || 5000,
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Database - NEON PostgreSQL
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL, // For migrations
  },
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
    cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 7
  },
  
  // Clerk
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  },
  
  // Kora Payment
  kora: {
    publicKey: process.env.KORA_PUBLIC_KEY,
    secretKey: process.env.KORA_SECRET_KEY,
    encryptionKey: process.env.KORA_ENCRYPTION_KEY,
    webhookSecret: process.env.KORA_WEBHOOK_SECRET,
    apiUrl: process.env.KORA_API_URL || 'https://api.korapay.com/merchant/api/v1'
  },
  
  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@swapride.com'
  },
  
  // Security
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    sessionSecret: process.env.SESSION_SECRET
  },
  
  // Feature Flags
  features: {
    aiPricing: process.env.ENABLE_AI_PRICING === 'true',
    escrow: process.env.ENABLE_ESCROW === 'true',
    idVerification: process.env.ENABLE_ID_VERIFICATION === 'true',
    vinValidation: process.env.ENABLE_VIN_VALIDATION === 'true'
  },
  
  // SMS
  sms: {
    apiKey: process.env.SMS_API_KEY,
    senderId: process.env.SMS_SENDER_ID || 'SwapRide'
  },
  
  // File Upload Limits
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedDocTypes: ['application/pdf', 'image/jpeg', 'image/png']
  },
  
  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};
