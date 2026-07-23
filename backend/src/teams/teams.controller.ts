import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { TaskResponseDto } from '@/tasks/dto/task.dto';
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
import {
  AddTeamMemberDto,
  CreateTeamDto,
  TeamMemberResponseDto,
  TeamResponseDto,
  UpdateTeamDto,
} from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/workspaces/:workspaceId/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace teams' })
  @ApiOkResponse({ type: TeamResponseDto, isArray: true })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.list(workspaceId, user.id);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List teams of the current user' })
  @ApiOkResponse({ type: TeamResponseDto, isArray: true })
  listMine(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.listMine(workspaceId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace team' })
  @ApiCreatedResponse({ type: TeamResponseDto })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.create(workspaceId, dto, user.id);
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'Get a workspace team' })
  @ApiOkResponse({ type: TeamResponseDto })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.findOne(workspaceId, teamId, user.id);
  }

  @Patch(':teamId')
  @ApiOperation({ summary: 'Update a workspace team' })
  @ApiOkResponse({ type: TeamResponseDto })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.update(workspaceId, teamId, dto, user.id);
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace team' })
  @ApiNoContentResponse()
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.remove(workspaceId, teamId, user.id);
  }

  @Post(':teamId/members')
  @ApiOperation({ summary: 'Add a workspace member to a team' })
  @ApiCreatedResponse({ type: TeamMemberResponseDto })
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.addMember(workspaceId, teamId, dto, user.id);
  }

  @Get(':teamId/members')
  @ApiOperation({ summary: 'List team members' })
  @ApiOkResponse({ type: TeamMemberResponseDto, isArray: true })
  listMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.listMembers(workspaceId, teamId, user.id);
  }

  @Delete(':teamId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a team' })
  @ApiNoContentResponse()
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.removeMember(
      workspaceId,
      teamId,
      memberId,
      user.id,
    );
  }

  @Get(':teamId/tasks')
  @ApiOperation({ summary: 'List accessible tasks assigned to a team' })
  @ApiOkResponse({ type: TaskResponseDto, isArray: true })
  listTasks(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: User,
  ) {
    return this.teamsService.listTasks(workspaceId, teamId, user.id);
  }
}
