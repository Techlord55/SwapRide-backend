const prisma = require('../config/prisma');
const Chat = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.chat.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.chat.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.chat.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.chat.create({ data })'); }
};
module.exports = Chat;
