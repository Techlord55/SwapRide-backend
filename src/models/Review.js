const prisma = require('../config/prisma');
const Review = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.review.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.review.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.review.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.review.create({ data })'); },
  aggregate: () => { throw new Error('Convert to Prisma: prisma.review.groupBy()'); }
};
const Report = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.report.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.report.findMany()'); },
  create: () => { throw new Error('Convert to Prisma: prisma.report.create({ data })'); }
};
module.exports = { Review, Report };
