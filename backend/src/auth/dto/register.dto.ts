import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  @MinLength(5)
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'password123' })
  password!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'John Doe' })
  name?: string;
}
