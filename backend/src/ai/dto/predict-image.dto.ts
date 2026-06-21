import { IsOptional, IsUUID } from 'class-validator';

export class PredictImageDto {
  @IsOptional()
  @IsUUID('4', { message: 'Invalid chat ID format' })
  chatId?: string;
}
