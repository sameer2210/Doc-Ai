import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/decorators/guards/roles.guard';
import { AuditLogService } from './audit-log.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Audit Logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs based on query parameters',
  })
  @ApiBody({ type: QueryAuditDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved audit logs',
    schema: {
      example: [
        {
          id: 'string',
          action: 'string',
          userId: 'string',
          timestamp: '2023-10-01T00:00:00Z',
          details: 'string',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get()
  async getAuditLogs(@Query() query: QueryAuditDto) {
    return this.auditLogService.getAuditLogs(query);
  }
}
