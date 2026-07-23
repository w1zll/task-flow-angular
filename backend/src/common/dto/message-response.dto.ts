import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({ example: 'Успешный ответ' })
  message: string;
}
