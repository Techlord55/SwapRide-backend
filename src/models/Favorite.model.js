const prisma = require('../config/prisma');
const Favorite = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.favorite.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.favorite.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.favorite.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.favorite.create({ data })'); }
};
module.exports = Favorite;
