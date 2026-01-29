const prisma = require('../config/prisma');
const Report = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.report.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.report.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.report.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.report.create({ data })'); }
};
module.exports = Report;
