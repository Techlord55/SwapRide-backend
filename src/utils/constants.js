/**
 * Application Constants
 * Centralized configuration and constant values
 */

module.exports = {
  // User Roles
  USER_ROLES: {
    USER: 'user',
    DEALER: 'dealer',
    ADMIN: 'admin',
    MODERATOR: 'moderator'
  },

  // Verification Status
  VERIFICATION_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  },

  // Vehicle Categories
  VEHICLE_CATEGORIES: {
    CAR: 'car',
    MOTORCYCLE: 'motorcycle',
    TRUCK: 'truck',
    VAN: 'van',
    SUV: 'suv',
    BUS: 'bus',
    OTHER: 'other'
  },

  // Vehicle Conditions
  CONDITIONS: {
    NEW: 'new',
    USED: 'used',
    DAMAGED: 'damaged',
    SALVAGE: 'salvage'
  },

  // Fuel Types
  FUEL_TYPES: {
    PETROL: 'petrol',
    DIESEL: 'diesel',
    ELECTRIC: 'electric',
    HYBRID: 'hybrid',
    CNG: 'cng',
    LPG: 'lpg',
    OTHER: 'other'
  },

  // Transmission Types
  TRANSMISSION_TYPES: {
    MANUAL: 'manual',
    AUTOMATIC: 'automatic',
    SEMI_AUTOMATIC: 'semi-automatic'
  },

  // Listing Status
  LISTING_STATUS: {
    ACTIVE: 'active',
    SOLD: 'sold',
    SWAPPED: 'swapped',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    REJECTED: 'rejected'
  },

  // Swap Status
  SWAP_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    EXPIRED: 'expired'
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  },

  // Payment Types
  PAYMENT_TYPES: {
    FEATURED_LISTING: 'featured_listing',
    BOOST: 'boost',
    SUBSCRIPTION: 'subscription',
    ESCROW: 'escrow',
    VERIFICATION: 'verification'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    SWAP_PROPOSAL: 'swap_proposal',
    SWAP_ACCEPTED: 'swap_accepted',
    SWAP_REJECTED: 'swap_rejected',
    SWAP_COUNTER: 'swap_counter',
    SWAP_CANCELLED: 'swap_cancelled',
    SWAP_COMPLETED: 'swap_completed',
    NEW_MESSAGE: 'new_message',
    LISTING_APPROVED: 'listing_approved',
    LISTING_REJECTED: 'listing_rejected',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    PRICE_CHANGE: 'price_change',
    NEW_REVIEW: 'new_review',
    SYSTEM: 'system'
  },

  // Report Reasons
  REPORT_REASONS: {
    FAKE: 'fake',
    STOLEN: 'stolen',
    SCAM: 'scam',
    INAPPROPRIATE: 'inappropriate',
    SPAM: 'spam',
    DUPLICATE: 'duplicate',
    WRONG_CATEGORY: 'wrong_category',
    OTHER: 'other'
  },

  // Report Status
  REPORT_STATUS: {
    PENDING: 'pending',
    INVESTIGATING: 'investigating',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed'
  },

  // Subscription Plans
  SUBSCRIPTION_PLANS: {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
    DEALER: 'dealer',
    ENTERPRISE: 'enterprise'
  },

  // File Upload Limits
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_FILES_PER_LISTING: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Date Formats
  DATE_FORMATS: {
    FULL: 'YYYY-MM-DD HH:mm:ss',
    DATE_ONLY: 'YYYY-MM-DD',
    TIME_ONLY: 'HH:mm:ss'
  },

  // Token Expiry
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: '15m',
    REFRESH_TOKEN: '7d',
    EMAIL_VERIFICATION: '24h',
    PASSWORD_RESET: '1h'
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400 // 24 hours
  },

  // Rate Limiting
  RATE_LIMITS: {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    AUTH: {
      windowMs: 15 * 60 * 1000,
      max: 5 // login attempts per window
    },
    API: {
      windowMs: 15 * 60 * 1000,
      max: 200
    }
  },

  // Geospatial
  GEO: {
    DEFAULT_RADIUS: 50000, // 50km in meters
    MAX_RADIUS: 200000 // 200km in meters
  },

  // Search
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    MAX_QUERY_LENGTH: 100,
    MAX_RESULTS: 100
  },

  // Review Ratings
  RATINGS: {
    MIN: 1,
    MAX: 5
  },

  // Part Categories (examples - can be expanded)
  PART_CATEGORIES: {
    ENGINE: 'engine',
    TRANSMISSION: 'transmission',
    BRAKES: 'brakes',
    SUSPENSION: 'suspension',
    ELECTRICAL: 'electrical',
    BODY: 'body',
    INTERIOR: 'interior',
    WHEELS_TIRES: 'wheels_tires',
    EXHAUST: 'exhaust',
    COOLING: 'cooling',
    FUEL_SYSTEM: 'fuel_system',
    OTHER: 'other'
  },

  // Socket Events
  SOCKET_EVENTS: {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    
    // Chat
    JOIN_CONVERSATION: 'chat:join',
    LEAVE_CONVERSATION: 'chat:leave',
    NEW_MESSAGE: 'chat:message',
    TYPING: 'chat:typing',
    
    // Swaps
    NEW_SWAP: 'swap:new',
    SWAP_ACCEPTED: 'swap:accepted',
    SWAP_REJECTED: 'swap:rejected',
    SWAP_COUNTER: 'swap:counter',
    
    // Notifications
    NEW_NOTIFICATION: 'notification:new',
    NOTIFICATION_READ: 'notification:read'
  },

  // Email Templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    SWAP_PROPOSAL: 'swap_proposal',
    SWAP_ACCEPTED: 'swap_accepted',
    PAYMENT_SUCCESS: 'payment_success',
    LISTING_APPROVED: 'listing_approved'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Regex Patterns
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    VIN: /^[A-HJ-NPR-Z0-9]{17}$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    EMAIL_SENT: 'Email sent successfully',
    PASSWORD_RESET: 'Password reset successful'
  },

  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
    DUPLICATE: 'Resource already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid token'
  }
};
