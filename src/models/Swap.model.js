const prisma = require('../config/prisma');
const Swap = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.swap.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.swap.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.swap.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.swap.create({ data })'); }
};
module.exports = Swap;
