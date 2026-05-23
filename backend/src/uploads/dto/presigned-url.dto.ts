import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsPositive, Max } from 'class-validator';

export class PresignedUrlDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'document.pdf', description: 'The name of the file to upload' })
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'application/pdf', description: 'The MIME type of the file' })
  fileType!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(50 * 1024 * 1024) // Max 50MB limit
  @ApiProperty({ example: 102400, description: 'The size of the file in bytes' })
  fileSize!: number;
}
