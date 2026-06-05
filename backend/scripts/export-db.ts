//npx ts-node scripts/export-db.ts > database-export.json
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const data = {
    chats: await prisma.chat.findMany(),
    messages: await prisma.message.findMany(),
    uploads: await prisma.upload.findMany(),
  };

  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
