import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { UploadsModule } from '../uploads/uploads.module';
import { ConfigModule } from '@config/config.module';
import { PrismaService } from '@prisma-local/prisma.service';

@Module({
  imports: [
    ConfigModule,
    UploadsModule, // provides UploadsService (S3 upload)
    HttpModule.register({
      // Default timeout; overridden per-call in AiService
      timeout: 15000,
      maxRedirects: 3,
    }),
  ],
  controllers: [AiController],
  providers: [AiService, PrismaService],
  exports: [AiService],
})
export class AiModule {}
