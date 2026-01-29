/**
 * Prisma Seed File
 * Creates initial data including admin user
 * 
 * Usage: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create admin user
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@swapride.com' },
    update: {
      role: 'admin',
      accountStatus: 'active'
    },
    create: {
      email: 'admin@swapride.com',
      firstName: 'Admin',
      lastName: 'User',
      clerkId: `admin_${Date.now()}`, // Temporary - update after Clerk signup
      role: 'admin',
      accountStatus: 'active',
      accountType: 'both',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      verificationBadges: ['email', 'trusted_seller'],
      phoneNumber: '+237650000000',
      dateOfBirth: new Date('1990-01-01')
    }
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create test dealer
  console.log('\n🚗 Creating test dealer...');
  const dealer = await prisma.user.upsert({
    where: { email: 'dealer@swapride.com' },
    update: {
      role: 'dealer',
      accountStatus: 'active'
    },
    create: {
      email: 'dealer@swapride.com',
      firstName: 'Test',
      lastName: 'Dealer',
      clerkId: `dealer_${Date.now()}`,
      role: 'dealer',
      accountStatus: 'active',
      accountType: 'seller',
      subscriptionPlan: 'basic',
      subscriptionStatus: 'active',
      verificationBadges: ['email', 'dealer'],
      phoneNumber: '+237651111111',
      dateOfBirth: new Date('1985-01-01')
    }
  });
  console.log(`✅ Dealer created: ${dealer.email}`);

  // Create test regular user
  console.log('\n👥 Creating test user...');
  const user = await prisma.user.upsert({
    where: { email: 'user@swapride.com' },
    update: {},
    create: {
      email: 'user@swapride.com',
      firstName: 'Test',
      lastName: 'User',
      clerkId: `user_${Date.now()}`,
      role: 'user',
      accountStatus: 'active',
      accountType: 'buyer',
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      verificationBadges: ['email'],
      phoneNumber: '+237652222222',
      dateOfBirth: new Date('1995-01-01')
    }
  });
  console.log(`✅ User created: ${user.email}`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📋 Created Users:');
  console.log('   Admin:  admin@swapride.com  (role: admin)');
  console.log('   Dealer: dealer@swapride.com (role: dealer)');
  console.log('   User:   user@swapride.com   (role: user)');
  console.log('\n💡 Next Steps:');
  console.log('   1. Have these users sign up via Clerk');
  console.log('   2. Update their clerkId in the database');
  console.log('   3. Or use: node make-admin.js <their-real-email>\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
