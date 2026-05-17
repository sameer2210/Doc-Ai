import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { MLSurveyService } from './ml-survey.service';
import { CreateMLSurveyDto } from './dto/create-ml-survey.dto';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('ML Survey')
@Controller('ml-survey')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MLSurveyController {
  constructor(private readonly mlSurveyService: MLSurveyService) {}

  @ApiOperation({
    summary: 'Submit ML Data Collection survey',
    description: 'Saves user details (name, age, gender, eye image URL) to the database.',
  })
  @Post()
  async submitSurvey(
    @Body() dto: CreateMLSurveyDto,
    @GetUser('userId') userId: string,
  ) {
    return this.mlSurveyService.create(dto, userId);
  }

  @ApiOperation({
    summary: 'Get user ML surveys',
    description: 'Retrieves all ML surveys submitted by the current user.',
  })
  @Get('history')
  async getHistory(@GetUser('userId') userId: string) {
    return this.mlSurveyService.getByUserId(userId);
  }
}
