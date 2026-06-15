import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { BodyInsightService } from './body-insight.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { GetUser } from '@common/decorators/get-user.decorator';
import { UpsertBodyInsightDto } from './dto/upsert-body-insight.dto';
import { BodyInsightResponseDto } from './dto/body-insight-response.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Body Insight')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('body-insight')
export class BodyInsightController {
  constructor(private readonly bodyInsightService: BodyInsightService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user Body Insight profile' })
  @ApiResponse({ status: 200, type: BodyInsightResponseDto, description: 'Profile found' })
  async getProfile(
    @GetUser('userId') userId: string,
  ): Promise<BodyInsightResponseDto | null> {
    return this.bodyInsightService.getProfile(userId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update current user Body Insight profile' })
  @ApiResponse({ status: 200, type: BodyInsightResponseDto, description: 'Profile saved successfully' })
  async upsertProfile(
    @GetUser('userId') userId: string,
    @Body() dto: UpsertBodyInsightDto,
  ): Promise<BodyInsightResponseDto> {
    return this.bodyInsightService.upsertProfile(userId, dto);
  }
}
