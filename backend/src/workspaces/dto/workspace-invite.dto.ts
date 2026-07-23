import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkspaceRole } from '../entities/workspace-role.enum';

export class CreateWorkspaceInviteDto {
  @ApiPropertyOptional({
    enum: [WorkspaceRole.MEMBER, WorkspaceRole.ADMIN],
    default: WorkspaceRole.MEMBER,
    required: false,
  })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  defaultRole?: WorkspaceRole;

  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUses?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  allowedEmail?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'example.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^(?!-)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, {
    message: 'allowedEmailDomain must be a valid domain',
  })
  allowedEmailDomain?: string | null;
}

export class WorkspaceInviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: WorkspaceRole })
  defaultRole: WorkspaceRole;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdByName: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ nullable: true })
  maxUses: number | null;

  @ApiProperty()
  usesCount: number;

  @ApiProperty({ nullable: true })
  revokedAt: Date | null;

  @ApiProperty({ nullable: true })
  allowedEmailDomain: string | null;

  @ApiProperty()
  hasSpecificEmailRestriction: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class CreatedWorkspaceInviteResponseDto extends WorkspaceInviteResponseDto {
  @ApiProperty({
    description: 'Raw token returned only once when the invite is created',
  })
  token: string;
}

export class WorkspaceInvitePreviewDto {
  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  workspaceName: string;

  @ApiProperty()
  inviterName: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ enum: WorkspaceRole })
  defaultRole: WorkspaceRole;

  @ApiProperty()
  emailRestricted: boolean;

  @ApiProperty()
  isDemoInvite: boolean;
}
