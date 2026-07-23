import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ColumnResponseDto } from '@/columns/dto/column.dto';
import { UserResponseDto } from '@/users/dto/user.dto';
import { BoardTemplate } from '../board-templates';
import { BoardRole } from '../entities/board-role.enum';

export class CreateBoardDto {
  @ApiProperty({ example: 'Board 1' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Board 1 description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '#669266', required: false })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Неверный формат кода' })
  color?: string;

  @ApiProperty({
    enum: BoardTemplate,
    default: BoardTemplate.EMPTY,
    required: false,
  })
  @IsOptional()
  @IsEnum(BoardTemplate)
  template?: BoardTemplate;

  @ApiProperty({ example: 'workspace-uuid', required: false })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class ShareBoardDto {
  @ApiProperty({ required: false, description: 'ID пользователя для приглашения' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ required: false, description: 'Email пользователя для приглашения' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    enum: [BoardRole.EDITOR, BoardRole.VIEWER],
    default: BoardRole.EDITOR,
    required: false,
  })
  @IsOptional()
  @IsIn([BoardRole.EDITOR, BoardRole.VIEWER])
  role?: BoardRole.EDITOR | BoardRole.VIEWER;
}

export class UpdateBoardDto extends PartialType(
  OmitType(CreateBoardDto, ['template', 'workspaceId'] as const),
) {}

export class UpdateBoardMemberRoleDto {
  @ApiProperty({ enum: [BoardRole.EDITOR, BoardRole.VIEWER] })
  @IsIn([BoardRole.EDITOR, BoardRole.VIEWER])
  role: BoardRole.EDITOR | BoardRole.VIEWER;
}

export class CreateBoardViewDto {
  @ApiProperty({ example: 'My urgent tasks' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({
    example: { assignee: 'me', priority: 'urgent' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiProperty({ example: { sort: 'priority' }, required: false })
  @IsOptional()
  @IsObject()
  sort?: Record<string, unknown>;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBoardViewDto extends PartialType(CreateBoardViewDto) {}

export class BoardViewResponseDto {
  @ApiProperty({ example: 'view-uuid' })
  id: string;

  @ApiProperty({ example: 'My urgent tasks' })
  title: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ example: 'user-uuid' })
  ownerId: string;

  @ApiProperty({ example: { assignee: 'me', priority: 'urgent' } })
  filters: Record<string, unknown>;

  @ApiProperty({ example: { sort: 'priority' } })
  sort: Record<string, unknown>;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class BoardCapabilitiesResponseDto {
  @ApiProperty()
  canReadBoard: boolean;

  @ApiProperty()
  canEditBoardContent: boolean;

  @ApiProperty()
  canManageBoardMembers: boolean;

  @ApiProperty()
  canDeleteBoard: boolean;

  @ApiProperty()
  canManageColumns: boolean;

  @ApiProperty()
  canUseWhiteboard: boolean;

  @ApiProperty()
  canManageBoardSettings: boolean;
}

export class BoardResponseDto {
  @ApiProperty({ example: 'board-uuid' })
  id: string;

  @ApiProperty({ example: 'Board 1' })
  title: string;

  @ApiProperty({ example: 'Board 1 description', required: false })
  description?: string;

  @ApiProperty({ example: '#669266', required: false })
  color?: string;

  @ApiProperty({ example: 'user-uuid' })
  ownerId: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ enum: BoardRole })
  currentUserRole: BoardRole;

  @ApiProperty({ type: () => BoardCapabilitiesResponseDto })
  capabilities: BoardCapabilitiesResponseDto;

  @ApiProperty({ type: () => ColumnResponseDto, isArray: true, required: false })
  columns?: ColumnResponseDto[];

  @ApiProperty({ type: () => BoardMemberResponseDto, isArray: true, required: false })
  members?: BoardMemberResponseDto[];

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class BoardMemberResponseDto {
  @ApiProperty({ example: 'member-uuid', nullable: true })
  id: string | null;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ enum: BoardRole })
  role: BoardRole;

  @ApiProperty({ example: 'user-uuid', nullable: true })
  invitedById: string | null;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}
