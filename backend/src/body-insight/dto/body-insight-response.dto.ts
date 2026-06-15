import { Gender } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class BodyInsightResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ required: false, type: String, nullable: true })
  dateOfBirth!: Date | null;

  @ApiProperty({ required: false, enum: Gender, nullable: true })
  gender!: Gender | null;

  @ApiProperty()
  diabetes!: boolean;

  @ApiProperty()
  hypertension!: boolean;

  @ApiProperty()
  blurredVision!: boolean;

  @ApiProperty()
  nightVisionDifficulty!: boolean;

  @ApiProperty()
  halosAroundLights!: boolean;

  @ApiProperty()
  familyHistoryOfCataract!: boolean;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty()
  completionPercentage!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
