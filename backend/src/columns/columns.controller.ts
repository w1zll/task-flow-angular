import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ColumnsService } from './column.service';
import {
  ColumnResponseDto,
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { User } from '@/users/entities/user.entity';

@ApiTags('columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  @ApiOperation({ summary: 'Создание колонки' })
  @ApiCreatedResponse({ type: ColumnResponseDto })
  create(@Body() dto: CreateColumnDto, @CurrentUser() user: User) {
    return this.columnsService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update column title/order' })
  @ApiOkResponse({ type: ColumnResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
    @CurrentUser() user: User,
  ) {
    return this.columnsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete column (cascades tasks)' })
  @ApiNoContentResponse()
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.columnsService.remove(id, user.id);
  }

  @Put('board/:boardId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder columns in board' })
  @ApiNoContentResponse()
  reorder(
    @Param('boardId') boardId: string,
    @Body() dto: ReorderColumnsDto,
    @CurrentUser() user: User,
  ) {
    return this.columnsService.reorder(dto, boardId, user.id);
  }
}
