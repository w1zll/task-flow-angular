import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { User } from '@/users/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  WhiteboardResponseDto,
  WhiteboardStateResponseDto,
} from './dto/whiteboard.dto';
import { WhiteboardsService } from './whiteboards.service';

@ApiTags('whiteboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/workspaces/:workspaceId/whiteboards')
export class WhiteboardsController {
  constructor(private readonly whiteboardsService: WhiteboardsService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace whiteboards' })
  @ApiQuery({ name: 'boardId', required: false })
  @ApiOkResponse({ type: WhiteboardResponseDto, isArray: true })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Query('boardId') boardId?: string,
  ) {
    return this.whiteboardsService.list(workspaceId, user.id, boardId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace whiteboard' })
  @ApiCreatedResponse({ type: WhiteboardResponseDto })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWhiteboardDto,
    @CurrentUser() user: User,
  ) {
    return this.whiteboardsService.create(workspaceId, dto, user.id);
  }

  @Get(':whiteboardId')
  @ApiOperation({ summary: 'Get a whiteboard' })
  @ApiOkResponse({ type: WhiteboardResponseDto })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser() user: User,
  ) {
    return this.whiteboardsService.findOne(workspaceId, whiteboardId, user.id);
  }

  @Get(':whiteboardId/state')
  @ApiOperation({ summary: 'Get whiteboard snapshot and operation tail' })
  @ApiQuery({ name: 'afterSequence', required: false })
  @ApiOkResponse({ type: WhiteboardStateResponseDto })
  state(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser() user: User,
    @Query('afterSequence') afterSequence?: string,
  ) {
    const parsedSequence = afterSequence ? Number(afterSequence) : undefined;
    return this.whiteboardsService.getState(
      workspaceId,
      whiteboardId,
      user.id,
      Number.isFinite(parsedSequence) ? parsedSequence : undefined,
    );
  }

  @Patch(':whiteboardId')
  @ApiOperation({ summary: 'Update a whiteboard' })
  @ApiOkResponse({ type: WhiteboardResponseDto })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @Body() dto: UpdateWhiteboardDto,
    @CurrentUser() user: User,
  ) {
    return this.whiteboardsService.update(
      workspaceId,
      whiteboardId,
      dto,
      user.id,
    );
  }

  @Delete(':whiteboardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a whiteboard' })
  @ApiNoContentResponse()
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser() user: User,
  ) {
    return this.whiteboardsService.remove(workspaceId, whiteboardId, user.id);
  }
}
