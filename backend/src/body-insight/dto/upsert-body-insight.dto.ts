import { Gender } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class UpsertBodyInsightDto {
  @ApiProperty({ required: false, example: '1990-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender, { message: 'Invalid gender value' })
  gender?: Gender;

  @ApiProperty({ example: false })
  @IsBoolean()
  diabetes!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  hypertension!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  blurredVision!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  nightVisionDifficulty!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  halosAroundLights!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  familyHistoryOfCataract!: boolean;
}
