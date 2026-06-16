import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Software Engineer' })

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;
}
