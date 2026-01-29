/**
 * Vehicle Controller - Prisma Implementation
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const slugify = require('slugify');

/**
 * @desc    Get all vehicles with filters and pagination
 * @route   GET /api/v1/vehicles
 * @access  Public
 */
exports.getAllVehicles = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    make,
    model,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    condition,
    bodyType,
    transmission,
    fuelType,
    city,
    region,
    country,
    openToSwap,
    sort = '-createdAt'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build where clause
  const where = {
    status: 'active'
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { make: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (make) where.make = { equals: make, mode: 'insensitive' };
  if (model) where.model = { equals: model, mode: 'insensitive' };
  if (minYear) where.year = { ...where.year, gte: parseInt(minYear) };
  if (maxYear) where.year = { ...where.year, lte: parseInt(maxYear) };
  if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
  if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };
  if (condition) where.condition = condition;
  if (bodyType) where.bodyType = bodyType;
  if (transmission) where.transmission = transmission;
  if (fuelType) where.fuelType = fuelType;
  if (city) where.city = { equals: city, mode: 'insensitive' };
  if (region) where.region = { equals: region, mode: 'insensitive' };
  if (country) where.country = { equals: country, mode: 'insensitive' };
  if (openToSwap) where.openToSwap = openToSwap === 'true';

  // Build orderBy
  const orderBy = {};
  if (sort.startsWith('-')) {
    const field = sort.substring(1);
    orderBy[field] = 'desc';
  } else {
    orderBy[sort] = 'asc';
  }

  // Execute query
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy,
      include: {
        seller: {
          select: {
            id: true,
            clerkId: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true,
            verificationBadges: true
          }
        },
        _count: {
          select: {
            favorites: true
          }
        }
      }
    }),
    prisma.vehicle.count({ where })
  ]);

  // Add favorite status if user is authenticated
  let vehiclesWithFavorites = vehicles;
  if (req.user) {
    const vehicleIds = vehicles.map(v => v.id);
    const userFavorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id,
        vehicleId: { in: vehicleIds }
      },
      select: { vehicleId: true }
    });

    const favoriteIds = new Set(userFavorites.map(f => f.vehicleId));
    vehiclesWithFavorites = vehicles.map(v => ({
      ...v,
      isFavorited: favoriteIds.has(v.id),
      favoritesCount: v._count.favorites
    }));
  }

  res.status(200).json({
    status: 'success',
    results: vehicles.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { vehicles: vehiclesWithFavorites }
  });
});

/**
 * @desc    Get featured vehicles
 * @route   GET /api/v1/vehicles/featured
 * @access  Public
 */
exports.getFeaturedVehicles = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: 'active',
      isFeatured: true,
      featuredUntil: { gte: new Date() }
    },
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      seller: {
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          rating: true,
          verificationBadges: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: vehicles.length,
    data: { vehicles }
  });
});

/**
 * @desc    Get nearby vehicles based on user location
 * @route   GET /api/v1/vehicles/nearby
 * @access  Public
 */
exports.getNearbyVehicles = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 50, limit = 20 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude are required'
    });
  }

  // Simple distance filtering (for more accurate geo queries, use PostGIS extension)
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: 'active',
      latitude: { not: null },
      longitude: { not: null }
    },
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      seller: {
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      }
    }
  });

  // Calculate distance and filter (simple Haversine formula)
  const nearbyVehicles = vehicles.filter(vehicle => {
    if (!vehicle.latitude || !vehicle.longitude) return false;
    
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      vehicle.latitude,
      vehicle.longitude
    );
    
    vehicle.distance = distance;
    return distance <= parseFloat(radius);
  }).sort((a, b) => a.distance - b.distance);

  res.status(200).json({
    status: 'success',
    results: nearbyVehicles.length,
    data: { vehicles: nearbyVehicles }
  });
});

/**
 * @desc    Get single vehicle by ID or slug
 * @route   GET /api/v1/vehicles/:id
 * @access  Public
 */
exports.getVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try to find by ID first, then by slug
  let vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { id },
        { slug: id }
      ]
    },
    include: {
      seller: {
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
          bio: true,
          rating: true,
          reviewCount: true,
          totalSales: true,
          verificationBadges: true,
          createdAt: true
        }
      },
      reviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      _count: {
        select: {
          favorites: true,
          reviews: true
        }
      }
    }
  });

  if (!vehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  // Increment view count
  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { views: { increment: 1 } }
  });

  // Check if favorited by current user
  let isFavorited = false;
  if (req.user) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user.id,
          vehicleId: vehicle.id
        }
      }
    });
    isFavorited = !!favorite;
  }

  res.status(200).json({
    status: 'success',
    data: {
      vehicle: {
        ...vehicle,
        isFavorited,
        favoritesCount: vehicle._count.favorites
      }
    }
  });
});

/**
 * @desc    Create new vehicle listing
 * @route   POST /api/v1/vehicles
 * @access  Private
 */
exports.createVehicle = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    make,
    model,
    year,
    mileage,
    condition,
    bodyType,
    transmission,
    fuelType,
    engineSize,
    color,
    vin,
    registrationNumber,
    price,
    currency,
    priceNegotiable,
    openToSwap,
    swapPreferences,
    features,
    images,
    location
  } = req.body;

  // Generate unique slug
  const baseSlug = slugify(`${make} ${model} ${year}`, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  
  while (await prisma.vehicle.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      title,
      slug,
      description,
      make,
      model,
      year: parseInt(year),
      mileage: parseInt(mileage),
      condition,
      bodyType,
      transmission,
      fuelType,
      engineSize,
      color,
      vin,
      registrationNumber,
      price: parseFloat(price),
      currency: currency || 'USD',
      priceNegotiable: priceNegotiable !== false,
      openToSwap: openToSwap === true,
      swapPreferences,
      features,
      images: images || [],
      city: location?.city,
      region: location?.region,
      country: location?.country,
      latitude: location?.latitude,
      longitude: location?.longitude,
      sellerId: req.user.id
    },
    include: {
      seller: {
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      }
    }
  });

  // Update user's total listings count
  await prisma.user.update({
    where: { id: req.user.id },
    data: { totalListings: { increment: 1 } }
  });

  res.status(201).json({
    status: 'success',
    message: 'Vehicle listing created successfully',
    data: { vehicle }
  });
});

/**
 * @desc    Update vehicle listing
 * @route   PUT /api/v1/vehicles/:id
 * @access  Private (Owner only)
 */
exports.updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if vehicle exists and belongs to user
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id }
  });

  if (!existingVehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  if (existingVehicle.sellerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to update this vehicle'
    });
  }

  const {
    title,
    description,
    price,
    priceNegotiable,
    openToSwap,
    swapPreferences,
    features,
    images,
    status
  } = req.body;

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price) updateData.price = parseFloat(price);
  if (typeof priceNegotiable !== 'undefined') updateData.priceNegotiable = priceNegotiable;
  if (typeof openToSwap !== 'undefined') updateData.openToSwap = openToSwap;
  if (swapPreferences) updateData.swapPreferences = swapPreferences;
  if (features) updateData.features = features;
  if (images) updateData.images = images;
  if (status) updateData.status = status;

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: updateData,
    include: {
      seller: {
        select: {
          id: true,
          clerkId: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Vehicle updated successfully',
    data: { vehicle }
  });
});

/**
 * @desc    Delete vehicle listing
 * @route   DELETE /api/v1/vehicles/:id
 * @access  Private (Owner only)
 */
exports.deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id }
  });

  if (!vehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  if (vehicle.sellerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to delete this vehicle'
    });
  }

  await prisma.vehicle.delete({
    where: { id }
  });

  // Update user's total listings count
  await prisma.user.update({
    where: { id: vehicle.sellerId },
    data: { totalListings: { decrement: 1 } }
  });

  res.status(200).json({
    status: 'success',
    message: 'Vehicle deleted successfully'
  });
});

/**
 * @desc    Toggle favorite/unfavorite vehicle
 * @route   PATCH /api/v1/vehicles/:id/favorite
 * @access  Private
 */
exports.toggleFavorite = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id }
  });

  if (!vehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_vehicleId: {
        userId: req.user.id,
        vehicleId: id
      }
    }
  });

  let isFavorited;
  if (existingFavorite) {
    await prisma.favorite.delete({
      where: { id: existingFavorite.id }
    });
    isFavorited = false;
  } else {
    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        vehicleId: id
      }
    });
    isFavorited = true;
  }

  res.status(200).json({
    status: 'success',
    message: isFavorited ? 'Added to favorites' : 'Removed from favorites',
    data: { isFavorited }
  });
});

/**
 * @desc    Contact seller about vehicle
 * @route   POST /api/v1/vehicles/:id/contact
 * @access  Private
 */
exports.contactSeller = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { seller: true }
  });

  if (!vehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  if (vehicle.sellerId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot contact yourself'
    });
  }

  // Increment contact count
  await prisma.vehicle.update({
    where: { id },
    data: { contactCount: { increment: 1 } }
  });

  // Create or get conversation
  const participants = [req.user.id, vehicle.sellerId].sort();
  let conversation = await prisma.conversation.findFirst({
    where: {
      participants: { hasEvery: participants }
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants,
        lastMessage: message,
        lastMessageAt: new Date()
      }
    });
  }

  // Create message
  const chat = await prisma.chat.create({
    data: {
      conversationId: conversation.id,
      senderId: req.user.id,
      receiverId: vehicle.sellerId,
      message
    }
  });

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessage: message,
      lastMessageAt: new Date()
    }
  });

  // Create notification for seller
  await prisma.notification.create({
    data: {
      userId: vehicle.sellerId,
      type: 'message',
      title: 'New Message',
      message: `You have a new message about your ${vehicle.make} ${vehicle.model}`,
      data: {
        vehicleId: vehicle.id,
        conversationId: conversation.id,
        senderId: req.user.id
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Message sent successfully',
    data: { conversation, chat }
  });
});

/**
 * @desc    Get user's own vehicle listings
 * @route   GET /api/v1/vehicles/my/listings
 * @access  Private
 */
exports.getMyListings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    sellerId: req.user.id
  };

  if (status) {
    where.status = status;
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            favorites: true,
            reviews: true
          }
        }
      }
    }),
    prisma.vehicle.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: vehicles.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { vehicles }
  });
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
