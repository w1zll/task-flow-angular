import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Task } from '@/tasks/entities/task.entity';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { WorkspaceRole } from '@/workspaces/entities/workspace-role.enum';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  let teamRepo: jest.Mocked<Partial<Repository<Team>>>;
  let teamMemberRepo: jest.Mocked<Partial<Repository<TeamMember>>>;
  let taskRepo: jest.Mocked<Partial<Repository<Task>>>;
  let workspacesService: jest.Mocked<Partial<WorkspacesService>>;
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };
    teamRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => data as Team),
      save: jest.fn(async (team: Team) => ({
        ...team,
        id: team.id ?? 'team-1',
        createdAt: team.createdAt ?? new Date(),
        updatedAt: team.updatedAt ?? new Date(),
      })),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder as any),
    };
    teamMemberRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data as TeamMember),
      save: jest.fn(async (member: TeamMember) => ({
        ...member,
        id: member.id ?? 'team-member-1',
      })),
      remove: jest.fn(),
    };
    taskRepo = {
      createQueryBuilder: jest.fn(() => queryBuilder as any),
    };
    workspacesService = {
      assertMember: jest.fn().mockResolvedValue({
        workspace: { id: 'workspace-1' },
        role: WorkspaceRole.OWNER,
      }),
    };

    service = new TeamsService(
      teamRepo as Repository<Team>,
      teamMemberRepo as Repository<TeamMember>,
      taskRepo as Repository<Task>,
      workspacesService as WorkspacesService,
    );
  });

  it('creates a team for a workspace owner', async () => {
    const result = await service.create(
      'workspace-1',
      {
        name: '  Design  ',
        description: '  Product design  ',
        color: '#8b5cf6',
      },
      'owner-1',
    );

    expect(teamRepo.create).toHaveBeenCalledWith({
      name: 'Design',
      description: 'Product design',
      color: '#8b5cf6',
      workspaceId: 'workspace-1',
      createdById: 'owner-1',
    });
    expect(result.members).toEqual([]);
  });

  it('does not let a regular workspace member manage teams', async () => {
    workspacesService.assertMember!.mockResolvedValueOnce({
      workspace: { id: 'workspace-1' },
      role: WorkspaceRole.MEMBER,
    } as any);

    await expect(
      service.create(
        'workspace-1',
        { name: 'Design' },
        'member-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(teamRepo.save).not.toHaveBeenCalled();
  });

  it('does not add a user from another workspace to a team', async () => {
    teamRepo.findOne!.mockResolvedValue({
      id: 'team-1',
      workspaceId: 'workspace-1',
      members: [],
    } as Team);
    workspacesService.assertMember!
      .mockResolvedValueOnce({
        workspace: { id: 'workspace-1' },
        role: WorkspaceRole.ADMIN,
      } as any)
      .mockRejectedValueOnce(new ForbiddenException());

    await expect(
      service.addMember(
        'workspace-1',
        'team-1',
        { userId: 'outside-user' },
        'admin-1',
      ),
    ).rejects.toThrow('Team members must belong to the same workspace');

    expect(teamMemberRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a team id outside the requested workspace', async () => {
    teamRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.findOne('workspace-1', 'team-2', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(teamRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'team-2', workspaceId: 'workspace-1' },
      relations: ['members', 'members.user'],
    });
  });

  it('lists only team tasks from boards accessible to the user', async () => {
    teamRepo.findOne!.mockResolvedValue({
      id: 'team-1',
      workspaceId: 'workspace-1',
      members: [],
    } as Team);

    await service.listTasks('workspace-1', 'team-1', 'member-1');

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'task.teamId = :teamId',
      { teamId: 'team-1' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'board.workspaceId = :workspaceId',
      { workspaceId: 'workspace-1' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(board.ownerId = :userId OR boardMember.role IN (:...roles))',
      expect.objectContaining({ userId: 'member-1' }),
    );
  });
});
