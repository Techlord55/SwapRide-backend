/**
 * TEMPORARY STUB - Vehicle Model
 * ⚠️  This controller needs to be converted to Prisma
 * See auth.controller.js for examples
 */
const prisma = require('../config/prisma');
const Vehicle = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.vehicle.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.vehicle.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.vehicle.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.vehicle.create({ data })'); },
  findByIdAndUpdate: () => { throw new Error('Convert to Prisma: prisma.vehicle.update()'); },
  findByIdAndDelete: () => { throw new Error('Convert to Prisma: prisma.vehicle.delete()'); }
};
module.exports = Vehicle;
