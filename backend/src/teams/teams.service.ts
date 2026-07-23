import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardRole } from '@/boards/entities/board-role.enum';
import { Task } from '@/tasks/entities/task.entity';
import { toPublicUser } from '@/users/public-user';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { WorkspaceRole } from '@/workspaces/entities/workspace-role.enum';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  UpdateTeamDto,
} from './dto/team.dto';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async list(workspaceId: string, userId: string): Promise<Team[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    const teams = await this.teamRepo.find({
      where: { workspaceId },
      relations: ['members', 'members.user'],
      order: { createdAt: 'ASC' },
    });
    return teams.map((team) => this.withPublicMembers(team));
  }

  async listMine(workspaceId: string, userId: string): Promise<Team[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    const teams = await this.teamRepo
      .createQueryBuilder('team')
      .innerJoin('team.members', 'membership', 'membership.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where('team.workspaceId = :workspaceId', { workspaceId })
      .orderBy('team.createdAt', 'ASC')
      .getMany();
    return teams.map((team) => this.withPublicMembers(team));
  }

  async findOne(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<Team> {
    await this.workspacesService.assertMember(workspaceId, userId);
    return this.getTeam(workspaceId, teamId);
  }

  async create(
    workspaceId: string,
    dto: CreateTeamDto,
    userId: string,
  ): Promise<Team> {
    await this.assertCanManage(workspaceId, userId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Team name is required');
    await this.assertUniqueName(workspaceId, name);

    const team = await this.teamRepo.save(
      this.teamRepo.create({
        name,
        description: dto.description?.trim() || null,
        color: dto.color ?? '#669266',
        workspaceId,
        createdById: userId,
      }),
    );
    team.members = [];
    return team;
  }

  async update(
    workspaceId: string,
    teamId: string,
    dto: UpdateTeamDto,
    userId: string,
  ): Promise<Team> {
    await this.assertCanManage(workspaceId, userId);
    const team = await this.getTeam(workspaceId, teamId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Team name is required');
      await this.assertUniqueName(workspaceId, name, teamId);
      team.name = name;
    }
    if (dto.description !== undefined) {
      team.description = dto.description.trim() || null;
    }
    if (dto.color !== undefined) team.color = dto.color;

    return this.withPublicMembers(await this.teamRepo.save(team));
  }

  async remove(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(workspaceId, userId);
    const team = await this.getTeam(workspaceId, teamId);
    await this.teamRepo.remove(team);
  }

  async addMember(
    workspaceId: string,
    teamId: string,
    dto: AddTeamMemberDto,
    userId: string,
  ): Promise<TeamMember> {
    await this.assertCanManage(workspaceId, userId);
    await this.getTeam(workspaceId, teamId);
    try {
      await this.workspacesService.assertMember(workspaceId, dto.userId);
    } catch {
      throw new ForbiddenException(
        'Team members must belong to the same workspace',
      );
    }

    const existing = await this.teamMemberRepo.findOne({
      where: { teamId, userId: dto.userId },
      relations: ['user'],
    });
    if (existing) return this.withPublicUser(existing);

    const saved = await this.teamMemberRepo.save(
      this.teamMemberRepo.create({ teamId, userId: dto.userId }),
    );
    const member = await this.teamMemberRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    return this.withPublicUser(member);
  }

  async listMembers(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<TeamMember[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    const team = await this.getTeam(workspaceId, teamId);
    return team.members;
  }

  async removeMember(
    workspaceId: string,
    teamId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(workspaceId, userId);
    await this.getTeam(workspaceId, teamId);
    const member = await this.teamMemberRepo.findOne({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    await this.teamMemberRepo.remove(member);
  }

  async listTasks(
    workspaceId: string,
    teamId: string,
    userId: string,
  ): Promise<Task[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    await this.getTeam(workspaceId, teamId);

    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.column', 'column')
      .innerJoin('column.board', 'board')
      .leftJoin(
        'board.members',
        'boardMember',
        'boardMember.userId = :userId',
        { userId },
      )
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.team', 'team')
      .where('task.teamId = :teamId', { teamId })
      .andWhere('board.workspaceId = :workspaceId', { workspaceId })
      .andWhere(
        '(board.ownerId = :userId OR boardMember.role IN (:...roles))',
        {
          userId,
          roles: [BoardRole.EDITOR, BoardRole.VIEWER],
        },
      )
      .orderBy('task.updatedAt', 'DESC')
      .distinct(true)
      .getMany();

    return tasks.map((task) => {
      if (task.assignee) task.assignee = toPublicUser(task.assignee);
      return task;
    });
  }

  private async getTeam(
    workspaceId: string,
    teamId: string,
  ): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId, workspaceId },
      relations: ['members', 'members.user'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return this.withPublicMembers(team);
  }

  private async assertCanManage(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const access = await this.workspacesService.assertMember(
      workspaceId,
      userId,
    );
    if (
      access.role !== WorkspaceRole.OWNER &&
      access.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can manage teams',
      );
    }
  }

  private async assertUniqueName(
    workspaceId: string,
    name: string,
    excludedTeamId?: string,
  ): Promise<void> {
    const existing = await this.teamRepo
      .createQueryBuilder('team')
      .where('team.workspaceId = :workspaceId', { workspaceId })
      .andWhere('LOWER(team.name) = LOWER(:name)', { name })
      .andWhere(excludedTeamId ? 'team.id != :excludedTeamId' : '1 = 1', {
        excludedTeamId,
      })
      .getOne();
    if (existing) {
      throw new BadRequestException(
        'A team with this name already exists in the workspace',
      );
    }
  }

  private withPublicMembers(team: Team): Team {
    if (team?.members) {
      team.members = team.members.map((member) =>
        this.withPublicUser(member),
      );
    }
    return team;
  }

  private withPublicUser(member: TeamMember): TeamMember {
    if (member?.user) member.user = toPublicUser(member.user);
    return member;
  }
}
