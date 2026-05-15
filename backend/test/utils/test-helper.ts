import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@app/app.module';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '@app/prisma/prisma.service';

export class TestHelper {
  static async createApp(
    overrideGuardWith?: Type<any>,
  ): Promise<{ app: INestApplication; moduleFixture: TestingModule }> {
    const builder = Test.createTestingModule({
      imports: [AppModule],
    });

    if (overrideGuardWith) {
      builder.overrideProvider(APP_GUARD).useClass(overrideGuardWith);
    }

    const moduleFixture = await builder.compile();
    const app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    return { app, moduleFixture };
  }

  static async closeApp(app: INestApplication) {
    await app.close();
  }

  static async cleanupUsers(
    app: INestApplication,
    emails: string[],
  ): Promise<void> {
    if (!emails || emails.length === 0) return;

    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({
      where: {
        email: { in: emails },
      },
    });
  }
}
