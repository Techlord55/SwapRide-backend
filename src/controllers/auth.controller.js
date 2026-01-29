/**
 * Authentication Controller - Prisma Version
 */

const prisma = require('../config/prisma');
const config = require('../config/config');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, location } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists with this email'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      city: location?.city,
      region: location?.region,
      country: location?.country,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  });

  // TODO: Send verification email
  // await sendVerificationEmail(user.email, verificationToken);

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: config.jwt.expire }
  );

  // Set cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt.cookieExpire * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict'
  };

  res.status(201).cookie('token', token, cookieOptions).json({
    status: 'success',
    message: 'Registration successful. Please verify your email.',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.password) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check password
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }

  // Check account status
  if (user.accountStatus !== 'active') {
    return res.status(403).json({
      status: 'error',
      message: `Account is ${user.accountStatus}`
    });
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLogin: new Date(),
      loginCount: { increment: 1 }
    }
  });

  // Generate JWT tokens
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: config.jwt.expire }
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.refreshSecret || process.env.JWT_SECRET,
    { expiresIn: config.jwt.refreshExpire }
  );

  // Set cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt.cookieExpire * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict'
  };

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).cookie('token', token, cookieOptions).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      city: true,
      region: true,
      country: true,
      role: true,
      accountType: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      verificationBadges: true,
      rating: true,
      reviewCount: true,
      totalSales: true,
      totalSwaps: true,
      totalListings: true,
      createdAt: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/update-profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, bio, location, avatar } = req.body;

  const updateData = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phone) updateData.phone = phone;
  if (bio) updateData.bio = bio;
  if (avatar) updateData.avatarUrl = avatar;
  if (location?.city) updateData.city = location.city;
  if (location?.region) updateData.region = location.region;
  if (location?.country) updateData.country = location.country;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      bio: true,
      avatarUrl: true,
      city: true,
      region: true,
      country: true
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/update-password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide current and new password'
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Check current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({
      status: 'error',
      message: 'Current password is incorrect'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date()
    }
  });

  // Generate new token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: config.jwt.expire }
  );

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
    data: { token }
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'No user found with this email'
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    }
  });

  // TODO: Send reset email
  // const resetUrl = `${config.clientUrl}/reset-password/${resetToken}`;
  // await sendPasswordResetEmail(user.email, resetUrl);

  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent to email',
    resetToken // Remove in production
  });
});

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password/:token
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a new password'
    });
  }

  // Hash token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired reset token'
    });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordChangedAt: new Date()
    }
  });

  // Generate new token
  const authToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: config.jwt.expire }
  );

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful',
    data: { token: authToken }
  });
});

/**
 * @desc    Verify email
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Hash token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired verification token'
    });
  }

  // Verify email
  const badges = user.verificationBadges || [];
  if (!badges.includes('email')) {
    badges.push('email');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      verificationBadges: badges,
      emailVerificationToken: null,
      emailVerificationExpires: null
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Send phone verification code
 * @route   POST /api/v1/auth/send-phone-code
 * @access  Private
 */
exports.sendPhoneVerificationCode = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      status: 'error',
      message: 'Phone number is required'
    });
  }

  // Validate phone format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid phone number format'
    });
  }

  // Generate 6-digit code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the code
  const hashedCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  // Update user
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      phone,
      phoneVerificationToken: hashedCode,
      phoneVerificationExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }
  });

  // TODO: Send SMS

  const response = {
    status: 'success',
    message: 'Verification code sent to phone number'
  };

  if (config.env === 'development') {
    response.verificationCode = verificationCode;
  }

  res.status(200).json(response);
});

/**
 * @desc    Verify phone number with code
 * @route   POST /api/v1/auth/verify-phone
 * @access  Private
 */
exports.verifyPhone = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      status: 'error',
      message: 'Verification code is required'
    });
  }

  // Hash the code
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // Find user with valid code
  const user = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      phoneVerificationToken: hashedCode,
      phoneVerificationExpires: { gt: new Date() }
    }
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired verification code'
    });
  }

  // Mark as verified
  const badges = user.verificationBadges || [];
  if (!badges.includes('phone')) {
    badges.push('phone');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isPhoneVerified: true,
      verificationBadges: badges,
      phoneVerificationToken: null,
      phoneVerificationExpires: null
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Phone number verified successfully',
    data: {
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        isPhoneVerified: updatedUser.isPhoneVerified,
        verificationBadges: updatedUser.verificationBadges
      }
    }
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret || process.env.JWT_SECRET);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: `Account is ${user.accountStatus}`
      });
    }

    // Check if password was changed after token
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          status: 'error',
          message: 'Password was recently changed. Please log in again'
        });
      }
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: config.jwt.expire }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.refreshSecret || process.env.JWT_SECRET,
      { expiresIn: config.jwt.refreshExpire }
    );

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired. Please log in again'
      });
    }
    throw error;
  }
});

/**
 * @desc    Handle Clerk webhook
 * @route   POST /api/v1/auth/clerk-webhook
 * @access  Public (with signature verification)
 */
exports.clerkWebhook = asyncHandler(async (req, res) => {
  // TODO: Verify Clerk webhook signature
  // const { type, data } = req.body;
  
  res.status(200).json({
    status: 'success',
    message: 'Webhook processed'
  });
});
