import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MobileLogoutDto {
  @ApiProperty({ description: 'The refresh token issued to the mobile client' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
