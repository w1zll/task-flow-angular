import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status: 'ok';

  @ApiProperty({ example: '2026-07-16T12:00:00.000Z' })
  timestamp: string;
}
