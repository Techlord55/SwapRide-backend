/**
 * Models Index - Prisma Edition
 * 
 * With Prisma, we don't export individual model classes.
 * Instead, all models are accessed through the Prisma Client.
 * 
 * Usage:
 *   const prisma = require('../config/prisma');
 *   const users = await prisma.user.findMany();
 *   const vehicles = await prisma.vehicle.findMany();
 * 
 * This file is kept for backwards compatibility but exports
 * the Prisma client instead of individual models.
 */

const prisma = require('../config/prisma');

// Export Prisma client for backwards compatibility
module.exports = prisma;

// If you need individual model access patterns, you can use:
// const { user, vehicle, part } = prisma;
