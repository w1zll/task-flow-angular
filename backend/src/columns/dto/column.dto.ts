import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TaskResponseDto } from '@/tasks/dto/task.dto';

export class CreateColumnDto {
  @ApiProperty({ example: 'To Do' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'board-uuid' })
  @IsUUID()
  boardId: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateColumnDto extends PartialType(CreateColumnDto) {}

export class ColumnResponseDto {
  @ApiProperty({ example: 'column-uuid' })
  id: string;

  @ApiProperty({ example: 'To Do' })
  title: string;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ type: () => TaskResponseDto, isArray: true, required: false })
  tasks?: TaskResponseDto[];

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt: string;
}

export class ReorderColumnsDto {
  @ApiProperty({ description: 'Массив ID колонок в новой последовательности' })
  @IsArray()
  @IsUUID('4', { each: true })
  columnIds: string[];
}
