import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBooleanString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { UserResponseDto } from '@/users/dto/user.dto';
import { NotificationType } from '../entities/notification.entity';

export class CreateTaskCommentDto {
  @ApiProperty({ example: 'I checked this. @Alice can confirm.' })
  @IsString()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ example: ['user-uuid'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];
}

export class UpdateTaskCommentDto extends PartialType(CreateTaskCommentDto) {}

export class MentionResponseDto {
  @ApiProperty({ example: 'mention-uuid' })
  id: string;

  @ApiProperty({ example: 'comment-uuid' })
  commentId: string;

  @ApiProperty({ example: 'task-uuid' })
  taskId: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ example: 'user-uuid' })
  mentionedUserId: string;

  @ApiProperty({ type: () => UserResponseDto })
  mentionedUser: UserResponseDto;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;
}

export class TaskCommentResponseDto {
  @ApiProperty({ example: 'comment-uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid' })
  taskId: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ example: 'user-uuid' })
  authorId: string;

  @ApiProperty({ type: () => UserResponseDto })
  author: UserResponseDto;

  @ApiProperty({ example: 'Looks good to me.' })
  body: string;

  @ApiProperty({ type: () => MentionResponseDto, isArray: true })
  mentions: MentionResponseDto[];

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class NotificationsQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'notification-uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid' })
  recipientId: string;

  @ApiProperty({ example: 'user-uuid', nullable: true })
  actorId: string | null;

  @ApiProperty({ type: () => UserResponseDto, nullable: true })
  actor: UserResponseDto | null;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ example: 'board-uuid', nullable: true })
  boardId: string | null;

  @ApiProperty({ example: 'task-uuid', nullable: true })
  taskId: string | null;

  @ApiProperty({ example: 'comment-uuid', nullable: true })
  commentId: string | null;

  @ApiProperty({ example: { taskTitle: 'Prepare release notes' }, nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z', nullable: true })
  readAt: string | null;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count: number;
}
