import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PredictImageDto {
  @ApiPropertyOptional({
    description: 'Optional patient identifier to associate with this prediction',
    example: 'PATIENT-2024-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  patientId?: string;
}
