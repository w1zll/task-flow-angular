import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  AnalyticsItemDto,
  AnalyticsQueryDto,
  CompletionSummaryDto,
  CreateTaskDto,
  CreateTaskChecklistItemDto,
  MoveTaskDto,
  ReorderTaskChecklistItemsDto,
  ReorderTasksDto,
  TaskAttachmentResponseDto,
  TaskChecklistItemResponseDto,
  TaskResponseDto,
  UpdateTaskChecklistItemDto,
  UpdateTaskDto,
  UploadTaskAttachmentDto,
} from './dto/task.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { taskAttachmentUploadOptions } from '@/storage/task-attachment.constants';
import type { TaskAttachmentUploadFile } from '@/storage/storage.types';
import type { Response } from 'express';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Создать задачу в колонке' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Изменить задачу' })
  @ApiOkResponse({ type: TaskResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Patch(':id/move')
  @ApiOperation({
    summary: 'Переместить задачу в другую колонку (drag & drop)',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  move(
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.move(id, dto, user.id);
  }

  @Put('column/:columnId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Переупорядочить задачи в колонке' })
  @ApiNoContentResponse()
  reorder(
    @Param('columnId') columnId: string,
    @Body() dto: ReorderTasksDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.reorder(dto, columnId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить задачу' })
  @ApiNoContentResponse()
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tasksService.remove(id, user.id);
  }

  @Post(':taskId/checklist-items')
  @ApiOperation({ summary: 'Create a task checklist item' })
  @ApiCreatedResponse({ type: TaskChecklistItemResponseDto })
  createChecklistItem(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskChecklistItemDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.createChecklistItem(taskId, dto, user.id);
  }

  @Put(':taskId/checklist-items/reorder')
  @ApiOperation({ summary: 'Reorder task checklist items' })
  @ApiOkResponse({ type: TaskChecklistItemResponseDto, isArray: true })
  reorderChecklistItems(
    @Param('taskId') taskId: string,
    @Body() dto: ReorderTaskChecklistItemsDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.reorderChecklistItems(taskId, dto, user.id);
  }

  @Put(':taskId/checklist-items/:itemId')
  @ApiOperation({ summary: 'Update a task checklist item' })
  @ApiOkResponse({ type: TaskChecklistItemResponseDto })
  updateChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTaskChecklistItemDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.updateChecklistItem(
      taskId,
      itemId,
      dto,
      user.id,
    );
  }

  @Delete(':taskId/checklist-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task checklist item' })
  @ApiNoContentResponse()
  removeChecklistItem(
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.removeChecklistItem(taskId, itemId, user.id);
  }

  @Post(':taskId/attachments')
  @UseInterceptors(FileInterceptor('file', taskAttachmentUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadTaskAttachmentDto })
  @ApiOperation({ summary: 'Upload a task attachment' })
  @ApiCreatedResponse({ type: TaskAttachmentResponseDto })
  uploadAttachment(
    @Param('taskId') taskId: string,
    @UploadedFile() file: TaskAttachmentUploadFile | undefined,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.uploadAttachment(taskId, file, user.id);
  }

  @Get(':taskId/attachments/:attachmentId/file')
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({ summary: 'Read a locally stored task attachment' })
  @ApiOkResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async attachmentFile(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.tasksService.getAttachmentFile(
      taskId,
      attachmentId,
      user.id,
    );
    const encodedFileName = encodeURIComponent(file.fileName);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName.replace(/"/g, '')}"; filename*=UTF-8''${encodedFileName}`,
    );
    return new StreamableFile(file.buffer);
  }

  @Delete(':taskId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task attachment' })
  @ApiNoContentResponse()
  removeAttachment(
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.removeAttachment(taskId, attachmentId, user.id);
  }

  @Get('analytics/daily')
  @ApiOperation({ summary: 'Статистика выполненных задач по дням' })
  @ApiOkResponse({ type: AnalyticsItemDto, isArray: true })
  analyticsDaily(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.getDailyAnalytics(user.id, query);
  }

  @Get('analytics/weekly')
  @ApiOperation({ summary: 'Статистика выполненных задач по неделям' })
  @ApiOkResponse({ type: AnalyticsItemDto, isArray: true })
  analyticsWeekly(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.getWeeklyAnalytics(user.id, query);
  }

  @Get('analytics/monthly')
  @ApiOperation({ summary: 'Статистика выполненных задач по месяцам' })
  @ApiOkResponse({ type: AnalyticsItemDto, isArray: true })
  analyticsMonthly(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.getMonthlyAnalytics(user.id, query);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Сводка по выполнению задач в срок и с опозданием' })
  @ApiOkResponse({ type: CompletionSummaryDto })
  analyticsSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.getCompletionSummary(user.id, query);
  }
}
