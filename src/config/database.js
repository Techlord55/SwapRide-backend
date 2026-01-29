/**
 * Database Configuration
 * Neon PostgreSQL connection setup with Prisma
 */

const prisma = require('./prisma');

/**
 * Test and connect to Neon PostgreSQL database
 */
const connectDatabase = async () => {
  try {
    // Test connection
    await prisma.$connect();
    
    // Run a simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Neon PostgreSQL connected successfully');
    
    return prisma;
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check that DATABASE_URL is set in .env');
    console.error('   2. Verify your Neon connection string is correct');
    console.error('   3. Run: npx prisma generate');
    console.error('   4. Run: npx prisma migrate dev --name init\n');
    throw error;
  }
};

/**
 * Gracefully disconnect from database
 */
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
};

module.exports = { 
  connectDatabase,
  disconnectDatabase,
  prisma 
};
