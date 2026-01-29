const prisma = require('../config/prisma');
const SavedSearch = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.savedSearch.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.savedSearch.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.savedSearch.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.savedSearch.create({ data })'); }
};
module.exports = SavedSearch;
