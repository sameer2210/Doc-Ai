import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaService } from '@prisma-local/prisma.service';
import { ConfigModule } from '@config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [UploadsService, PrismaService],
  exports: [UploadsService],
})
export class UploadsModule {}
