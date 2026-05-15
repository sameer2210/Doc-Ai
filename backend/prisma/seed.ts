import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // ✅ ESM-compatible import (not `import * as`)

const prisma = new PrismaClient();

async function seedDevAdmins() {
  await prisma.user.upsert({
    where: { email: 'john.doe@company.com' },
    update: {}, // nothing to update for now
    create: {
      email: 'john.doe@company.com',
      name: 'John Doe',
      password: await bcrypt.hash('password@123', 10),
      role: 'ADMIN',
    },
  });
}

async function seedDevUsers() {
  await prisma.user.upsert({
    where: { email: 'jane.doe@business.com' },
    update: {}, // nothing to update for now
    create: {
      email: 'jane.doe@business.com',
      name: 'Jane Doe',
      password: await bcrypt.hash('secret#word', 10),
    },
  });
}

async function main() {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') {
    await seedDevAdmins();
    await seedDevUsers();
  } else {
    console.log(`No seeding for environment: ${env}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seeding completed');
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
