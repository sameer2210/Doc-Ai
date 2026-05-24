import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateMLSurveyDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 25 })
  age!: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Male' })
  gender!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'https://spandavidya-bucket.s3.amazonaws.com/uploads/...' })
  imageUrl!: string;
}
