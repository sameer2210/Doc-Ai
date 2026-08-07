import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EyeValidationStatus } from '../constants/eye-validation.enum';

export class EyeValidationResultDto {
  @ApiProperty({
    enum: EyeValidationStatus,
    description: 'Status of the Eye Detection pre-validation check (PERFORMED or SKIPPED)',
    example: EyeValidationStatus.PERFORMED,
  })
  status!: EyeValidationStatus;

  @ApiPropertyOptional({
    description: 'Human-readable message explaining the pre-validation status if skipped',
    example: 'Eye validation could not be completed because the validation service was temporarily unavailable.',
  })
  message?: string;
}

export class PredictCataractResultDto {
  @ApiProperty({ description: 'Cataract detection classification prediction', example: 'Immature_Cataract' })
  prediction!: string;

  @ApiProperty({ description: 'Model prediction confidence score between 0.0 and 1.0', example: 0.92 })
  confidence!: number;

  @ApiProperty({ description: 'S3 uploaded image URL', example: 'https://sameer-aws-s3-bucket.s3.ap-south-1.amazonaws.com/uploads/...' })
  uploadedImageUrl!: string;

  @ApiProperty({ description: 'Associated chat session ID', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  chatId!: string;

  @ApiPropertyOptional({ type: EyeValidationResultDto, description: 'Eye validation status payload' })
  eyeValidation?: EyeValidationResultDto;
}
