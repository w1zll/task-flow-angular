import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BoardActivityService } from './board-activity.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';
import {
  BoardActivityQueryDto,
  BoardActivityResponseDto,
} from './dto/board-activity.dto';
import { BoardActivityEventType } from './entities/board-activity.entity';

@ApiTags('boards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/boards')
export class BoardActivityController {
  constructor(private readonly activityService: BoardActivityService) {}

  @Get(':id/activities')
  @ApiOperation({ summary: 'List board activity entries' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiQuery({
    name: 'event',
    required: false,
    enum: BoardActivityEventType,
    isArray: true,
  })
  @ApiOkResponse({ type: BoardActivityResponseDto, isArray: true })
  findAll(
    @Param('id') boardId: string,
    @Query() query: BoardActivityQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.activityService.findForBoard(boardId, user.id, {
      limit: query.limit ?? 50,
      before: query.before,
      event: query.event,
    });
  }
}
