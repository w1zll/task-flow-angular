import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/users/dto/user.dto';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  BoardActivityEntityType,
  BoardActivityEventType,
} from '../entities/board-activity.entity';

export class BoardActivityQueryDto {
  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ required: false, example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  before?: string;

  @ApiProperty({
    enum: BoardActivityEventType,
    required: false,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsEnum(BoardActivityEventType, { each: true })
  event?: BoardActivityEventType[];
}

export class BoardActivityResponseDto {
  @ApiProperty({ example: 'activity-uuid' })
  id: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ type: () => UserResponseDto, required: false, nullable: true })
  actorUser?: UserResponseDto | null;

  @ApiProperty({ enum: BoardActivityEventType })
  event: BoardActivityEventType;

  @ApiProperty({ enum: BoardActivityEntityType })
  entityType: BoardActivityEntityType;

  @ApiProperty({ example: 'task-uuid', required: false, nullable: true })
  entityId: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { taskId: 'task-uuid', title: 'Fix bug' },
    required: false,
    nullable: true,
  } as any)
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  createdAt: string;
}
