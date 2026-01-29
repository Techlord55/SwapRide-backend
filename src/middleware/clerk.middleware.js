/**
 * PRODUCTION-READY Clerk Authentication Middleware
 * Verifies Clerk JWT tokens locally using public keys
 * No external API calls needed per request
 */

const { verifyToken, createClerkClient } = require('@clerk/backend');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

// Initialize Clerk client with secret key
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Get or create user from Clerk ID
 */
async function getOrCreateUser(clerkId) {
  // First, try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      accountType: true,
      accountStatus: true,
      isActive: true,
    },
  });

  // If user exists, return it
  if (user) {
    return user;
  }

  // User doesn't exist, need to create
  console.log('🆕 User not found in database, fetching from Clerk API...');
  console.log(`   Clerk ID: ${clerkId}`);

  try {
    // Fetch full user data from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    // Extract email from email addresses array
    const email = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
                  clerkUser.emailAddresses?.[0]?.emailAddress ||
                  `user_${clerkId}@temp.swapride.com`;
    
    const firstName = clerkUser.firstName || 'User';
    const lastName = clerkUser.lastName || clerkId.substring(5, 13);
    const isEmailVerified = clerkUser.emailAddresses?.[0]?.verification?.status === 'verified';

    console.log(`✅ Fetched from Clerk API:`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Verified: ${isEmailVerified}`);

    // Use upsert to handle race conditions
    user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        // Update email/name if user was created by another request
        email,
        firstName,
        lastName,
        isEmailVerified,
      },
      create: {
        clerkId,
        email,
        firstName,
        lastName,
        isEmailVerified,
        accountStatus: 'active',
        isActive: true,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountType: true,
        accountStatus: true,
        isActive: true,
      },
    });

    console.log(`✅ Created new user: ${email}`);
    return user;
    
  } catch (clerkError) {
    console.error(`❌ Failed to fetch from Clerk API:`, clerkError.message);
    
    // Fallback: Use upsert with placeholder data
    user = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        email: `user_${clerkId}@temp.swapride.com`,
        firstName: 'User',
        lastName: clerkId.substring(5, 13),
        isEmailVerified: false,
        accountStatus: 'active',
        isActive: true,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountType: true,
        accountStatus: true,
        isActive: true,
      },
    });
    
    console.log(`⚠️  Created user with placeholder data: ${user.email}`);
    return user;
  }
}

/**
 * Verify Clerk JWT token locally (FAST - no API calls)
 */
const verifyClerkToken = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  try {
    // Verify JWT locally using Clerk's public keys
    // This is FAST - no external API calls
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
      throw new ApiError(401, 'Invalid token');
    }

    const clerkId = payload.sub;

    // Get or create user
    const user = await getOrCreateUser(clerkId);

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'User account is inactive');
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, `User account is ${user.accountStatus}`);
    }

    // Attach user to request
    req.user = user;
    req.clerkId = clerkId;
    req.clerkPayload = payload; // Full JWT payload if needed

    next();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    
    // Log error for debugging
    console.error('Clerk token verification error:', error.message);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired - please login again');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token format');
    }
    
    throw new ApiError(401, 'Invalid or expired token');
  }
});

/**
 * Optional Clerk authentication
 * Sets user if token exists, but doesn't fail if missing
 */
const optionalClerkAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Verify JWT locally
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (payload && payload.sub) {
        const clerkId = payload.sub;

        // Get or create user
        const user = await getOrCreateUser(clerkId);

        if (user && user.isActive && user.accountStatus === 'active') {
          req.user = user;
          req.clerkId = clerkId;
          req.clerkPayload = payload;
        }
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});

/**
 * Restrict routes to specific roles
 * Usage: router.get('/', restrictTo('admin'), controller)
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. This route is restricted to: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

module.exports = {
  verifyClerkToken,
  optionalClerkAuth,
  restrictTo,
};
