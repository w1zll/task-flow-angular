import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/users/entities/user.entity';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AnalyticsDashboardResponseDto,
  AnalyticsQueryDto,
} from './dto/analytics.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/workspaces/:workspaceId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get workspace analytics dashboard metrics' })
  @ApiOkResponse({ type: AnalyticsDashboardResponseDto })
  dashboard(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.dashboard(workspaceId, user.id, query);
  }
}
