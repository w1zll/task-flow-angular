import { UserResponseDto } from '@/users/dto/user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace-role.enum';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Product Team' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}

export class WorkspaceResponseDto {
  @ApiProperty({ example: 'workspace-uuid' })
  id: string;

  @ApiProperty({ example: 'Product Team' })
  name: string;

  @ApiProperty()
  isPersonal: boolean;

  @ApiProperty()
  isDemoTemplate: boolean;

  @ApiProperty()
  isDemoInstance: boolean;

  @ApiProperty({
    example: '2026-06-25T18:00:00.000Z',
    nullable: true,
    required: false,
  })
  demoExpiresAt: string | null;

  @ApiProperty({
    example: 'workspace-uuid',
    nullable: true,
    required: false,
  })
  demoSourceWorkspaceId: string | null;

  @ApiProperty({ example: 'user-uuid' })
  ownerId: string;

  @ApiProperty({ enum: WorkspaceRole })
  currentUserRole: WorkspaceRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  updatedAt: string;
}

export class WorkspaceMemberResponseDto {
  @ApiProperty({ example: 'membership-uuid' })
  id: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ enum: WorkspaceRole })
  role: WorkspaceRole;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  updatedAt: string;
}

export class UpdateWorkspaceMemberRoleDto {
  @ApiProperty({
    enum: [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER],
  })
  @IsIn([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER])
  role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER;
}
