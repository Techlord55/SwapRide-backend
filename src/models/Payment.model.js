const prisma = require('../config/prisma');
const Payment = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.payment.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.payment.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.payment.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.payment.create({ data })'); }
};
module.exports = Payment;
