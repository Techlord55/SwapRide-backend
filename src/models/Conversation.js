const prisma = require('../config/prisma');
const Conversation = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.conversation.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.conversation.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.conversation.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.conversation.create({ data })'); }
};
module.exports = Conversation;
