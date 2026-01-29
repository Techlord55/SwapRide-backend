const prisma = require('../config/prisma');
const Subscription = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.subscription.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.subscription.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.subscription.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.subscription.create({ data })'); }
};
module.exports = Subscription;
