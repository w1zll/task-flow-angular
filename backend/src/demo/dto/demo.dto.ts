import { UserDto } from '@/auth/dto/auth.dto';
import { ApiProperty } from '@nestjs/swagger';

export class DemoWorkspaceSessionDto {
  @ApiProperty({ type: () => UserDto })
  user: UserDto;

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;
}
