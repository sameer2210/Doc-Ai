import { PrismaService } from '@prisma-local/prisma.service';

export async function cleanupDatabase(prisma: PrismaService, emails?: string[]) {
  // If specific emails are provided, clean those up.
  if (emails && emails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
    return;
  }

  // Fallback to cleanup all users containing test email domains to keep DB clean
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: '@test.com' } },
        { email: { startsWith: 'test-user-' } },
        { email: { startsWith: 'new-user-' } },
      ],
    },
  });
}
