import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'name@company.com' })
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'password123' })
  password!: string;
}
