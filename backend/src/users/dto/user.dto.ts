import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  avatar?: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}