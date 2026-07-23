import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WhiteboardOperationType } from '../entities/whiteboard-operation-type.enum';

export class CreateWhiteboardDto {
  @ApiProperty({ example: 'Sprint planning canvas' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @ApiProperty({ required: false, example: 'Sketches and notes for sprint 12' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: '#3b82f6' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiProperty({ required: false, example: 'draw' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiProperty({ required: false, example: 'board-uuid' })
  @IsOptional()
  @IsUUID()
  boardId?: string | null;
}

export class UpdateWhiteboardDto extends PartialType(CreateWhiteboardDto) {}

export class CreateWhiteboardOperationDto {
  @ApiProperty({ example: 'client-generated-operation-id' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotencyKey: string;

  @ApiProperty({ enum: WhiteboardOperationType })
  @IsEnum(WhiteboardOperationType)
  type: WhiteboardOperationType;

  @ApiProperty({ example: { tool: 'pen', points: [{ x: 10, y: 12 }] } })
  @IsObject()
  data: Record<string, unknown>;
}

export class WhiteboardCapabilitiesResponseDto {
  @ApiProperty()
  canReadWhiteboard: boolean;

  @ApiProperty()
  canDrawWhiteboard: boolean;

  @ApiProperty()
  canManageWhiteboard: boolean;
}

export class WhiteboardResponseDto {
  @ApiProperty({ example: 'whiteboard-uuid' })
  id: string;

  @ApiProperty({ example: 'Sprint planning canvas' })
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ example: '#3b82f6' })
  color: string;

  @ApiProperty({ example: 'draw' })
  icon: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ example: 'board-uuid', nullable: true })
  boardId: string | null;

  @ApiProperty({ example: 'user-uuid', nullable: true })
  createdById: string | null;

  @ApiProperty({ example: 42 })
  lastSequence: number;

  @ApiProperty({ example: 'editor' })
  currentUserRole: string;

  @ApiProperty({ type: () => WhiteboardCapabilitiesResponseDto })
  capabilities: WhiteboardCapabilitiesResponseDto;

  @ApiProperty({ example: '2026-07-02T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-07-02T12:00:00.000Z' })
  updatedAt: string;
}

export class WhiteboardOperationResponseDto {
  @ApiProperty({ example: 'operation-uuid' })
  id: string;

  @ApiProperty({ example: 'whiteboard-uuid' })
  whiteboardId: string;

  @ApiProperty({ example: 42 })
  sequence: number;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 'client-generated-operation-id' })
  idempotencyKey: string;

  @ApiProperty({ enum: WhiteboardOperationType })
  type: WhiteboardOperationType;

  @ApiProperty({ example: { tool: 'pen', points: [{ x: 10, y: 12 }] } })
  data: Record<string, unknown>;

  @ApiProperty({ example: '2026-07-02T12:00:00.000Z' })
  createdAt: string;
}

export class WhiteboardSnapshotResponseDto {
  @ApiProperty({ example: 'snapshot-uuid' })
  id: string;

  @ApiProperty({ example: 'whiteboard-uuid' })
  whiteboardId: string;

  @ApiProperty({ example: 50 })
  sequence: number;

  @ApiProperty({ example: { operations: [] } })
  data: Record<string, unknown>;

  @ApiProperty({ example: '2026-07-02T12:00:00.000Z' })
  createdAt: string;
}

export class WhiteboardStateResponseDto {
  @ApiProperty({ type: () => WhiteboardResponseDto })
  whiteboard: WhiteboardResponseDto;

  @ApiProperty({ type: () => WhiteboardSnapshotResponseDto, nullable: true })
  snapshot: WhiteboardSnapshotResponseDto | null;

  @ApiProperty({ type: () => WhiteboardOperationResponseDto, isArray: true })
  operations: WhiteboardOperationResponseDto[];

  @ApiProperty({ example: 72 })
  latestSequence: number;
}
