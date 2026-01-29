const prisma = require('../config/prisma');
const Notification = {
  findOne: () => { throw new Error('Convert to Prisma: prisma.notification.findUnique()'); },
  find: () => { throw new Error('Convert to Prisma: prisma.notification.findMany()'); },
  findById: () => { throw new Error('Convert to Prisma: prisma.notification.findUnique({ where: { id } })'); },
  create: () => { throw new Error('Convert to Prisma: prisma.notification.create({ data })'); }
};
module.exports = Notification;
