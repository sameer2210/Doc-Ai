import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'StrongPassword123', minLength: 6 })
  password!: string;
}
