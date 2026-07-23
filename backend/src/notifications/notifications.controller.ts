import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/users/entities/user.entity';
import {
  CreateTaskCommentDto,
  NotificationResponseDto,
  NotificationsQueryDto,
  TaskCommentResponseDto,
  UnreadCountResponseDto,
  UpdateTaskCommentDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'List task comments' })
  @ApiOkResponse({ type: TaskCommentResponseDto, isArray: true })
  listTaskComments(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.listTaskComments(taskId, user.id);
  }

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Create a task comment' })
  @ApiCreatedResponse({ type: TaskCommentResponseDto })
  createTaskComment(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.createTaskComment(taskId, dto, user.id);
  }

  @Patch('tasks/:taskId/comments/:commentId')
  @ApiOperation({ summary: 'Update a task comment' })
  @ApiOkResponse({ type: TaskCommentResponseDto })
  updateTaskComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTaskCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.updateTaskComment(
      taskId,
      commentId,
      dto,
      user.id,
    );
  }

  @Delete('tasks/:taskId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task comment' })
  @ApiNoContentResponse()
  deleteTaskComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.deleteTaskComment(
      taskId,
      commentId,
      user.id,
    );
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  listNotifications(
    @Query() query: NotificationsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.listNotifications(
      user.id,
      query.unreadOnly === 'true',
    );
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notificationsService.countUnread(user.id) };
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiNoContentResponse()
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }
}
