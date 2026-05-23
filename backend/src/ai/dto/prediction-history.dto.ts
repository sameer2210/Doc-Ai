import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PredictionHistoryDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by prediction label', example: 'IOL_Inserted' })
  @IsOptional()
  @IsString()
  prediction?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID', example: 'PATIENT-2024-001' })
  @IsOptional()
  @IsString()
  patientId?: string;
}
