import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  Max,
  MaxLength,
} from 'class-validator';

const ALLOWED_PRESIGNED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
] as const;

export class PresignedUrlDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(180)
  @ApiProperty({ example: 'document.pdf', description: 'The name of the file to upload' })
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(ALLOWED_PRESIGNED_MIME_TYPES)
  @ApiProperty({ example: 'application/pdf', description: 'The MIME type of the file' })
  fileType!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(50 * 1024 * 1024) // Max 50MB limit
  @ApiProperty({ example: 102400, description: 'The size of the file in bytes' })
  fileSize!: number;
}
