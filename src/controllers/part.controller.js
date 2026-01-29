/**
 * Part Controller - Prisma Implementation
 * Handles vehicle parts marketplace
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const slugify = require('slugify');

/**
 * @desc    Get all parts with filters
 * @route   GET /api/v1/parts
 * @access  Public
 */
exports.getAllParts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    category,
    condition,
    minPrice,
    maxPrice,
    city,
    region,
    country,
    openToSwap,
    inStock,
    partNumber,
    brand,
    sort = '-createdAt'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    // Show all parts for now - you can add status filter later
    // status: 'active'
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { partName: { contains: search, mode: 'insensitive' } },
      { partNumber: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
  if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };
  if (city) where.city = { equals: city, mode: 'insensitive' };
  if (region) where.region = { equals: region, mode: 'insensitive' };
  if (country) where.country = { equals: country, mode: 'insensitive' };
  if (openToSwap) where.openToSwap = openToSwap === 'true';
  if (inStock) where.inStock = inStock === 'true';
  if (partNumber) where.partNumber = { contains: partNumber, mode: 'insensitive' };
  if (brand) where.brand = { equals: brand, mode: 'insensitive' };

  const orderBy = {};
  if (sort.startsWith('-')) {
    orderBy[sort.substring(1)] = 'desc';
  } else {
    orderBy[sort] = 'asc';
  }

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            rating: true,
            reviewCount: true,
            verificationBadges: true
          }
        }
      }
    }),
    prisma.part.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: parts.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { parts }
  });
});

/**
 * @desc    Search parts
 * @route   GET /api/v1/parts/search
 * @access  Public
 */
exports.searchParts = asyncHandler(async (req, res) => {
  const { q, make, model, year, category } = req.query;

  if (!q) {
    return res.status(400).json({
      status: 'error',
      message: 'Search query is required'
    });
  }

  const where = {
    status: 'active',
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { partName: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } }
    ]
  };

  if (make) where.compatibleMakes = { has: make };
  if (model) where.compatibleModels = { has: model };
  if (year) where.compatibleYears = { has: parseInt(year) };
  if (category) where.category = category;

  const parts = await prisma.part.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: parts.length,
    data: { parts }
  });
});

/**
 * @desc    Get part categories
 * @route   GET /api/v1/parts/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = [
    { value: 'engine', label: 'Engine' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'body', label: 'Body' },
    { value: 'interior', label: 'Interior' },
    { value: 'exterior', label: 'Exterior' },
    { value: 'wheels_tires', label: 'Wheels & Tires' },
    { value: 'exhaust', label: 'Exhaust' },
    { value: 'cooling', label: 'Cooling' },
    { value: 'fuel_system', label: 'Fuel System' },
    { value: 'lights', label: 'Lights' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'other', label: 'Other' }
  ];

  res.status(200).json({
    status: 'success',
    data: { categories }
  });
});

/**
 * @desc    Get compatible parts for a vehicle
 * @route   GET /api/v1/parts/compatible/:vehicleId
 * @access  Public
 */
exports.getCompatibleParts = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { make: true, model: true, year: true }
  });

  if (!vehicle) {
    return res.status(404).json({
      status: 'error',
      message: 'Vehicle not found'
    });
  }

  const parts = await prisma.part.findMany({
    where: {
      status: 'active',
      OR: [
        { isUniversal: true },
        {
          AND: [
            { compatibleMakes: { has: vehicle.make } },
            { compatibleModels: { has: vehicle.model } },
            { compatibleYears: { has: vehicle.year } }
          ]
        }
      ]
    },
    include: {
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: parts.length,
    data: { parts }
  });
});

/**
 * @desc    Get single part by ID
 * @route   GET /api/v1/parts/:partId
 * @access  Public
 */
exports.getPartById = asyncHandler(async (req, res) => {
  const { partId } = req.params;

  const part = await prisma.part.findFirst({
    where: {
      OR: [
        { id: partId },
        { slug: partId }
      ]
    },
    include: {
      seller: {
        select: {
          id: true,
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
      }
    }
  });

  if (!part) {
    return res.status(404).json({
      status: 'error',
      message: 'Part not found'
    });
  }

  // Increment view count
  await prisma.part.update({
    where: { id: part.id },
    data: { views: { increment: 1 } }
  });

  res.status(200).json({
    status: 'success',
    data: { part }
  });
});

/**
 * @desc    Create new part listing
 * @route   POST /api/v1/parts
 * @access  Private
 */
exports.createPart = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    partName,
    partNumber,
    category,
    compatibleMakes,
    compatibleModels,
    compatibleYears,
    isUniversal,
    condition,
    price,
    currency,
    priceNegotiable,
    openToSwap,
    acceptedPartCategories,
    swapAdditionalNotes,
    quantity,
    inStock,
    images,
    location,
    weight,
    dimensions,
    material,
    brand,
    manufacturer,
    warranty,
    otherSpecs
  } = req.body;

  // Generate slug
  const baseSlug = slugify(`${partName} ${category}`, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.part.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const part = await prisma.part.create({
    data: {
      title,
      slug,
      description,
      partName,
      partNumber,
      category,
      compatibleMakes: compatibleMakes || [],
      compatibleModels: compatibleModels || [],
      compatibleYears: compatibleYears || [],
      isUniversal: isUniversal || false,
      condition,
      price: parseFloat(price),
      currency: currency || 'USD',
      priceNegotiable: priceNegotiable !== false,
      openToSwap: openToSwap === true,
      acceptedPartCategories: acceptedPartCategories || [],
      swapAdditionalNotes,
      quantity: parseInt(quantity) || 1,
      inStock: inStock !== false,
      images: images || [],
      city: location?.city,
      region: location?.region,
      country: location?.country,
      latitude: location?.latitude,
      longitude: location?.longitude,
      weight,
      dimensions,
      material,
      brand,
      manufacturer,
      warranty,
      otherSpecs,
      sellerId: req.user.id
    },
    include: {
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          rating: true
        }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    message: 'Part listing created successfully',
    data: { part }
  });
});

/**
 * @desc    Check part ownership middleware
 */
exports.checkOwnership = asyncHandler(async (req, res, next) => {
  const { partId } = req.params;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { sellerId: true }
  });

  if (!part) {
    return res.status(404).json({
      status: 'error',
      message: 'Part not found'
    });
  }

  if (part.sellerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to perform this action'
    });
  }

  next();
});

/**
 * @desc    Update part
 * @route   PUT /api/v1/parts/:partId
 * @access  Private (Owner)
 */
exports.updatePart = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const {
    title,
    description,
    price,
    priceNegotiable,
    openToSwap,
    quantity,
    inStock,
    images,
    warranty,
    condition
  } = req.body;

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price) updateData.price = parseFloat(price);
  if (typeof priceNegotiable !== 'undefined') updateData.priceNegotiable = priceNegotiable;
  if (typeof openToSwap !== 'undefined') updateData.openToSwap = openToSwap;
  if (quantity) updateData.quantity = parseInt(quantity);
  if (typeof inStock !== 'undefined') updateData.inStock = inStock;
  if (images) updateData.images = images;
  if (warranty) updateData.warranty = warranty;
  if (condition) updateData.condition = condition;

  const part = await prisma.part.update({
    where: { id: partId },
    data: updateData,
    include: {
      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part updated successfully',
    data: { part }
  });
});

/**
 * @desc    Delete part
 * @route   DELETE /api/v1/parts/:partId
 * @access  Private (Owner)
 */
exports.deletePart = asyncHandler(async (req, res) => {
  const { partId } = req.params;

  await prisma.part.delete({
    where: { id: partId }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part deleted successfully'
  });
});

/**
 * @desc    Add images to part
 * @route   POST /api/v1/parts/:partId/images
 * @access  Private (Owner)
 */
exports.addImages = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const { images } = req.body;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { images: true }
  });

  const updatedImages = [...part.images, ...images];

  await prisma.part.update({
    where: { id: partId },
    data: { images: updatedImages }
  });

  res.status(200).json({
    status: 'success',
    message: 'Images added successfully'
  });
});

/**
 * @desc    Delete image from part
 * @route   DELETE /api/v1/parts/:partId/images/:imageId
 * @access  Private (Owner)
 */
exports.deleteImage = asyncHandler(async (req, res) => {
  const { partId, imageId } = req.params;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { images: true }
  });

  const updatedImages = part.images.filter((img, index) => 
    img.publicId !== imageId && index.toString() !== imageId
  );

  await prisma.part.update({
    where: { id: partId },
    data: { images: updatedImages }
  });

  res.status(200).json({
    status: 'success',
    message: 'Image deleted successfully'
  });
});

/**
 * @desc    Update part status
 * @route   PATCH /api/v1/parts/:partId/status
 * @access  Private (Owner)
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const { status } = req.body;

  if (!['active', 'sold', 'inactive'].includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status'
    });
  }

  await prisma.part.update({
    where: { id: partId },
    data: { status }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part status updated'
  });
});

/**
 * @desc    Feature part
 * @route   POST /api/v1/parts/:partId/feature
 * @access  Private (Owner)
 */
exports.featurePart = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const { duration = 7 } = req.body; // Default 7 days

  const featuredUntil = new Date();
  featuredUntil.setDate(featuredUntil.getDate() + duration);

  await prisma.part.update({
    where: { id: partId },
    data: {
      isFeatured: true,
      featuredUntil
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part featured successfully'
  });
});

/**
 * @desc    Boost part (placeholder for premium feature)
 * @route   POST /api/v1/parts/:partId/boost
 * @access  Private (Owner)
 */
exports.boostPart = asyncHandler(async (req, res) => {
  // TODO: Implement boosting logic with payment
  res.status(200).json({
    status: 'success',
    message: 'Part boost initiated'
  });
});

/**
 * @desc    Mark part as sold
 * @route   PATCH /api/v1/parts/:partId/sold
 * @access  Private (Owner)
 */
exports.markAsSold = asyncHandler(async (req, res) => {
  const { partId } = req.params;

  await prisma.part.update({
    where: { id: partId },
    data: {
      status: 'sold',
      inStock: false
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part marked as sold'
  });
});

/**
 * @desc    Add compatible vehicles
 * @route   POST /api/v1/parts/:partId/compatible-vehicles
 * @access  Private (Owner)
 */
exports.addCompatibleVehicles = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const { makes, models, years } = req.body;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { compatibleMakes: true, compatibleModels: true, compatibleYears: true }
  });

  const updateData = {};
  if (makes) {
    updateData.compatibleMakes = [...new Set([...part.compatibleMakes, ...makes])];
  }
  if (models) {
    updateData.compatibleModels = [...new Set([...part.compatibleModels, ...models])];
  }
  if (years) {
    updateData.compatibleYears = [...new Set([...part.compatibleYears, ...years])];
  }

  await prisma.part.update({
    where: { id: partId },
    data: updateData
  });

  res.status(200).json({
    status: 'success',
    message: 'Compatible vehicles added'
  });
});

/**
 * @desc    Remove compatible vehicle
 * @route   DELETE /api/v1/parts/:partId/compatible-vehicles/:vehicleId
 * @access  Private (Owner)
 */
exports.removeCompatibleVehicle = asyncHandler(async (req, res) => {
  // TODO: Implement specific vehicle compatibility removal
  res.status(200).json({
    status: 'success',
    message: 'Compatible vehicle removed'
  });
});

/**
 * @desc    Approve part (Admin)
 * @route   PATCH /api/v1/parts/:partId/approve
 * @access  Private/Admin
 */
exports.approvePart = asyncHandler(async (req, res) => {
  const { partId } = req.params;

  await prisma.part.update({
    where: { id: partId },
    data: {
      isVerified: true,
      status: 'active'
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Part approved'
  });
});

/**
 * @desc    Reject part (Admin)
 * @route   PATCH /api/v1/parts/:partId/reject
 * @access  Private/Admin
 */
exports.rejectPart = asyncHandler(async (req, res) => {
  const { partId } = req.params;
  const { reason } = req.body;

  await prisma.part.update({
    where: { id: partId },
    data: {
      status: 'inactive',
      isVerified: false
    }
  });

  // TODO: Notify seller about rejection

  res.status(200).json({
    status: 'success',
    message: 'Part rejected'
  });
});

/**
 * @desc    Get user's parts
 * @route   GET /api/v1/parts/my
 * @access  Private
 */
exports.getMyParts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    sellerId: req.user.id
  };

  if (status) {
    where.status = status;
  }

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.part.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    results: parts.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: { parts }
  });
});
