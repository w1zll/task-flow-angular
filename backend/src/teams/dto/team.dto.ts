import { UserResponseDto } from '@/users/dto/user.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Design' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false, example: 'Product design team' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: '#8b5cf6' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class AddTeamMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId: string;
}

export class TeamMemberResponseDto {
  @ApiProperty({ example: 'team-membership-uuid' })
  id: string;

  @ApiProperty({ example: 'team-uuid' })
  teamId: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  createdAt: string;
}

export class TeamResponseDto {
  @ApiProperty({ example: 'team-uuid' })
  id: string;

  @ApiProperty({ example: 'Design' })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ example: '#8b5cf6' })
  color: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ example: 'user-uuid', nullable: true })
  createdById: string | null;

  @ApiProperty({ type: () => TeamMemberResponseDto, isArray: true })
  members: TeamMemberResponseDto[];

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-06-25T12:00:00.000Z' })
  updatedAt: string;
}

export class TeamSummaryResponseDto {
  @ApiProperty({ example: 'team-uuid' })
  id: string;

  @ApiProperty({ example: 'Design' })
  name: string;

  @ApiProperty({ example: '#8b5cf6' })
  color: string;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;
}
