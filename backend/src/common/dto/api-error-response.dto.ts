import { ApiProperty } from '@nestjs/swagger';
import {
  API_ERROR_CONTRACT_VERSION,
  ApiErrorCode,
  ErrorCategory,
} from '@common/constants/api-error-codes.enum';

export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code of the response',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Machine-readable error code for client pipeline resolution',
    enum: ApiErrorCode,
    example: ApiErrorCode.INVALID_IMAGE,
    required: false,
  })
  errorCode?: ApiErrorCode;

  @ApiProperty({
    description: 'High-level functional category of the error',
    enum: ErrorCategory,
    example: ErrorCategory.IMAGE,
    required: false,
  })
  category?: ErrorCategory;

  @ApiProperty({
    description: 'Human-readable error message or list of validation messages',
    example: 'Invalid image file format',
  })
  message!: string | string[];

  @ApiProperty({
    description: 'Standard HTTP error name',
    example: 'Bad Request',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Unique request correlation tracking identifier',
    example: 'req-c1a2b3c4-5678',
  })
  requestId!: string;

  @ApiProperty({
    description: 'ISO-8601 UTC timestamp when error occurred',
    example: '2026-08-06T09:30:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Machine error contract version string',
    example: API_ERROR_CONTRACT_VERSION,
  })
  contractVersion!: string;
}
