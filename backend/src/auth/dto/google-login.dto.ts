import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
    description: 'The idToken from Google Sign-In on the client side',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
