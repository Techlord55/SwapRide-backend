/**
 * TEMPORARY STUB - User Model
 * This is a temporary compatibility layer.
 * Controllers using this need to be converted to Prisma.
 * 
 * To convert a controller:
 * 1. Replace: const User = require('../models/User.model');
 * 2. With: const prisma = require('../config/prisma');
 * 3. Replace: User.findOne() with prisma.user.findUnique()
 * 4. Replace: User.find() with prisma.user.findMany()
 * etc.
 */

const prisma = require('../config/prisma');

// This is a stub that will throw helpful errors
const User = {
  findOne: () => {
    throw new Error('This controller needs to be converted to Prisma. See auth.controller.js for examples.');
  },
  find: () => {
    throw new Error('This controller needs to be converted to Prisma. See auth.controller.js for examples.');
  },
  findById: () => {
    throw new Error('This controller needs to be converted to Prisma. Use prisma.user.findUnique({ where: { id } })');
  },
  create: () => {
    throw new Error('This controller needs to be converted to Prisma. Use prisma.user.create({ data })');
  },
  findByIdAndUpdate: () => {
    throw new Error('This controller needs to be converted to Prisma. Use prisma.user.update({ where: { id }, data })');
  },
  findByIdAndDelete: () => {
    throw new Error('This controller needs to be converted to Prisma. Use prisma.user.delete({ where: { id } })');
  }
};

module.exports = User;

// Helpful message
console.warn('⚠️  WARNING: User.model.js is a Mongoose stub. Controller needs Prisma conversion!');
console.warn('    See NEON_MIGRATION_GUIDE.md for conversion instructions');
