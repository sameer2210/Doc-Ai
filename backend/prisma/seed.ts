import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedResult = {
  email: string;
  action: 'created' | 'updated';
};

async function upsertUser(params: {
  email: string;
  name: string;
  password: string;
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
}): Promise<SeedResult> {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });

  await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      password: await bcrypt.hash(params.password, 10),
      ...(params.role ? { role: params.role } : {}),
    },
    create: {
      email: params.email,
      name: params.name,
      password: await bcrypt.hash(params.password, 10),
      ...(params.role ? { role: params.role } : {}),
    },
  });

  return {
    email: params.email,
    action: existing ? 'updated' : 'created',
  };
}

async function seedSamplePrediction() {
  const adminUser = await prisma.user.findUnique({
    where: { email: 'john.doe@company.com' },
  });

  if (!adminUser) {
    return { action: 'skipped' as const, reason: 'admin user not found' };
  }

  const chat = await prisma.chat.findFirst({
    where: { userId: adminUser.id },
    orderBy: { createdAt: 'desc' },
  });

  const targetChat =
    chat ??
    (await prisma.chat.create({
      data: {
        userId: adminUser.id,
        title: 'AI Health Consultation',
      },
    }));

  const seedS3Key = `uploads/${adminUser.id}/seed-mock-eye-scan.jpg`;
  const seedFileUrl = 'https://example.com/mock-eye-scan.jpg';

  const upload = await prisma.upload.upsert({
    where: { s3Key: seedS3Key },
    update: {
      fileUrl: seedFileUrl,
      fileType: 'image/jpeg',
    },
    create: {
      userId: adminUser.id,
      fileUrl: seedFileUrl,
      fileType: 'image/jpeg',
      s3Key: seedS3Key,
    },
  });

  const existing = await prisma.aiPrediction.findUnique({
    where: { uploadId: upload.id },
  });

  if (existing) {
    const updated = await prisma.aiPrediction.update({
      where: { id: existing.id },
      data: {
        prediction: 'Normal',
        confidence: 0.93,
        rawMlResponse: {
          class: 'Normal',
          confidence: 0.93,
          source: 'seed-script',
        },
      },
    });

    return { action: 'updated' as const, id: updated.id };
  }

  const message = await prisma.message.create({
    data: {
      chatId: targetChat.id,
      role: 'SYSTEM',
      content: 'Seed eye scan result prepared for development testing.',
    },
  });

  await prisma.upload.update({
    where: { id: upload.id },
    data: { messageId: message.id },
  });

  const created = await prisma.aiPrediction.create({
    data: {
      userId: adminUser.id,
      messageId: message.id,
      uploadId: upload.id,
      prediction: 'Normal',
      confidence: 0.93,
      rawMlResponse: {
        class: 'Normal',
        confidence: 0.93,
        source: 'seed-script',
      },
    },
  });

  return { action: 'created' as const, id: created.id };
}

async function main() {
  const env = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL;

  console.log('[seed] NODE_ENV =', env);
  console.log('[seed] DATABASE_URL =', dbUrl ?? '(missing)');

  if (!dbUrl) {
    throw new Error('DATABASE_URL is missing. Check backend/.env');
  }

  if (env !== 'development') {
    console.log(`[seed] Skipped default seed for environment: ${env}`);
    console.log('[seed] Tip: set NODE_ENV=development to run default seed data.');
    return;
  }

  const seeded = await Promise.all([
    upsertUser({
      email: 'john.doe@company.com',
      name: 'John Doe',
      password: 'password@123',
      role: 'ADMIN',
    }),
    upsertUser({
      email: 'jane.doe@business.com',
      name: 'Jane Doe',
      password: 'secret#word',
      role: 'USER',
    }),
  ]);

  const predictionSeed = await seedSamplePrediction();
  const totalUsers = await prisma.user.count();
  const totalPredictions = await prisma.aiPrediction.count();

  console.log('[seed] Results:');
  for (const item of seeded) {
    console.log(`  - ${item.email}: ${item.action}`);
  }
  console.log('[seed] AiPrediction:', predictionSeed);
  console.log('[seed] Total users in DB =', totalUsers);
  console.log('[seed] Total predictions in DB =', totalPredictions);
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
