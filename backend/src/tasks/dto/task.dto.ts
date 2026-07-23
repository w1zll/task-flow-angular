import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsBoolean,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { TaskPriority } from '../entities/task.entity';
import { UserResponseDto } from '@/users/dto/user.dto';
import { TeamSummaryResponseDto } from '@/teams/dto/team.dto';

export class CreateTaskDto {
  @ApiProperty({ example: 'Task 1' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false, example: ['Label 1', 'Label 2'] })
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ required: false, example: 'assignee-user-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({ required: false, example: '2026-05-05T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assigneeName?: string;

  @ApiProperty({ required: false, nullable: true, example: 240 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  estimateMinutes?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000)
  storyPoints?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 'team-uuid' })
  @IsOptional()
  @IsUUID()
  teamId?: string | null;

  @ApiProperty({ example: 'column-uuid' })
  @IsUUID()
  columnId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class TaskResponseDto {
  @ApiProperty({ example: 'task-uuid' })
  id: string;

  @ApiProperty({ example: 'Task 1' })
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ required: false, example: ['Label 1', 'Label 2'] })
  labels?: string[];

  @ApiProperty({
    required: false,
    example: '2026-05-05T12:00:00.000Z',
    nullable: true,
  })
  dueDate?: string | null;

  @ApiProperty({ required: false, example: 'assignee-user-uuid' })
  assigneeId?: string;

  @ApiProperty({ required: false })
  assigneeName?: string;

  @ApiProperty({ type: () => UserResponseDto, required: false })
  assignee?: UserResponseDto;

  @ApiProperty({ required: false, nullable: true, example: 'team-uuid' })
  teamId?: string | null;

  @ApiProperty({
    type: () => TeamSummaryResponseDto,
    required: false,
    nullable: true,
  })
  team?: TeamSummaryResponseDto | null;

  @ApiProperty({ required: false })
  isCompleted: boolean;

  @ApiProperty({ required: false, example: '2026-05-05T12:00:00.000Z' })
  completedAt?: string;

  @ApiProperty({ required: false, nullable: true, example: 240 })
  estimateMinutes?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 5 })
  storyPoints?: number | null;

  @ApiProperty({
    type: () => TaskChecklistItemResponseDto,
    isArray: true,
    required: false,
  })
  checklistItems?: TaskChecklistItemResponseDto[];

  @ApiProperty({
    type: () => TaskAttachmentResponseDto,
    isArray: true,
    required: false,
  })
  attachments?: TaskAttachmentResponseDto[];

  @ApiProperty({ example: 'column-uuid' })
  columnId: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class MoveTaskDto {
  @ApiProperty({ description: 'ID новой колонки' })
  @IsUUID()
  columnId: string;

  @ApiProperty({ description: 'Новая позиция заказа' })
  @IsNumber()
  order: number;
}

export class ReorderTasksDto {
  @ApiProperty({ description: 'Массив тасок в новой последовательности' })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];
}

export class CreateTaskChecklistItemDto {
  @ApiProperty({ example: 'Prepare acceptance criteria' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false, nullable: true, example: 'user-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

export class UpdateTaskChecklistItemDto extends PartialType(
  CreateTaskChecklistItemDto,
) {}

export class ReorderTaskChecklistItemsDto {
  @ApiProperty({ example: ['checklist-item-uuid'], isArray: true })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];
}

export class TaskChecklistItemResponseDto {
  @ApiProperty({ example: 'checklist-item-uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid' })
  taskId: string;

  @ApiProperty({ example: 'Prepare acceptance criteria' })
  title: string;

  @ApiProperty({ example: false })
  isDone: boolean;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ required: false, nullable: true, example: 'user-uuid' })
  assigneeId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  assigneeName?: string | null;

  @ApiProperty({ type: () => UserResponseDto, required: false, nullable: true })
  assignee?: UserResponseDto | null;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class UploadTaskAttachmentDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;
}

export class TaskAttachmentResponseDto {
  @ApiProperty({ example: 'attachment-uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid' })
  taskId: string;

  @ApiProperty({ example: 'brief.pdf' })
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: '/api/tasks/task-uuid/attachments/attachment-uuid/file' })
  url: string;

  @ApiProperty({ enum: ['local', 'cloudinary', 'imagekit'] })
  storageProvider: string;

  @ApiProperty({ example: true })
  isImage: boolean;

  @ApiProperty({ example: 'user-uuid', nullable: true })
  uploadedById: string | null;

  @ApiProperty({ type: () => UserResponseDto, required: false, nullable: true })
  uploadedBy?: UserResponseDto | null;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;
}

export class AnalyticsQueryDto {
  @ApiProperty({ required: false, example: 'board-uuid' })
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @ApiProperty({ required: false, example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ required: false, example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AnalyticsItemDto {
  @ApiProperty({ example: '2026-05-05' })
  period: string;

  @ApiProperty({ example: 12 })
  count: number;
}

export class CompletionSummaryDto {
  @ApiProperty({ example: 24 })
  total: number;

  @ApiProperty({ example: 18 })
  onTime: number;

  @ApiProperty({ example: 6 })
  late: number;
}
