import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { Board } from '@/boards/entities/board.entity';
import { Task } from '@/tasks/entities/task.entity';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let taskRepo: jest.Mocked<Partial<Repository<Task>>>;
  let boardRepo: jest.Mocked<Partial<Repository<Board>>>;
  let workspacesService: jest.Mocked<Partial<WorkspacesService>>;
  let boardPermissions: jest.Mocked<Partial<BoardPermissionsService>>;
  let taskQueryBuilder: {
    innerJoinAndSelect: jest.Mock;
    innerJoin: jest.Mock;
    leftJoin: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    distinct: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };
  let boardQueryBuilder: {
    leftJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    distinct: jest.Mock;
    getRawMany: jest.Mock;
  };

  const createTask = (overrides: Partial<Task> = {}) =>
    ({
      id: 'task-1',
      title: 'Task 1',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      completedAt: null,
      dueDate: null,
      isCompleted: false,
      storyPoints: null,
      teamId: null,
      team: null,
      assigneeId: null,
      assignee: null,
      column: {
        boardId: 'board-1',
        board: { id: 'board-1', title: 'Roadmap' },
      },
      ...overrides,
    }) as Task;

  beforeEach(async () => {
    taskQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    boardQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    taskRepo = {
      createQueryBuilder: jest.fn(() => taskQueryBuilder as never),
    };
    boardRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => boardQueryBuilder as never),
    };
    workspacesService = {
      assertMember: jest.fn().mockResolvedValue({
        workspace: { id: 'workspace-1' },
        role: 'member',
      }),
    };
    boardPermissions = {
      assertCanRead: jest.fn().mockResolvedValue({
        role: 'editor',
        capabilities: {
          canReadBoard: true,
          canEditBoardContent: true,
          canManageBoardMembers: false,
          canDeleteBoard: false,
          canManageColumns: true,
          canUseWhiteboard: true,
          canManageBoardSettings: false,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Board), useValue: boardRepo },
        { provide: WorkspacesService, useValue: workspacesService },
        { provide: BoardPermissionsService, useValue: boardPermissions },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty dashboard when the workspace has no accessible boards', async () => {
    boardQueryBuilder.getRawMany.mockResolvedValue([]);

    const result = await service.dashboard('workspace-1', 'user-1', {});

    expect(result.totals).toEqual({
      completed: 0,
      open: 0,
      overdue: 0,
      total: 0,
    });
    expect(result.burndown).toBeNull();
    expect(workspacesService.assertMember).toHaveBeenCalledWith(
      'workspace-1',
      'user-1',
    );
  });

  it('rejects a board outside the workspace', async () => {
    boardRepo.findOne!.mockResolvedValueOnce(null);

    await expect(
      service.dashboard('workspace-1', 'user-1', { boardId: 'board-2' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds workspace analytics from accessible tasks', async () => {
    boardQueryBuilder.getRawMany.mockResolvedValue([{ id: 'board-1' }]);
    taskQueryBuilder.getMany.mockResolvedValue([
      createTask({
        id: 'task-1',
        isCompleted: true,
        completedAt: new Date('2026-06-10T00:00:00.000Z'),
        dueDate: new Date('2026-06-11T00:00:00.000Z'),
        teamId: 'team-1',
        team: { id: 'team-1', name: 'Design' },
        assigneeId: 'user-2',
        assignee: { id: 'user-2', name: 'Ava' },
        storyPoints: 5,
      }),
      createTask({
        id: 'task-2',
        isCompleted: false,
        dueDate: new Date('2026-06-05T00:00:00.000Z'),
        teamId: null,
        assigneeId: null,
      }),
    ]);

    const result = await service.dashboard('workspace-1', 'user-1', {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    expect(result.totals).toEqual({
      completed: 1,
      open: 1,
      overdue: 1,
      total: 2,
    });
    expect(result.completedByTeam).toEqual([
      { id: 'team-1', name: 'Design', count: 1 },
    ]);
    expect(result.workloadByAssignee).toEqual([
      {
        id: null,
        name: null,
        openCount: 1,
        overdueCount: 1,
        estimateMinutes: 0,
        storyPoints: 0,
      },
    ]);
    expect(result.overdue.topTasks).toEqual([
      expect.objectContaining({
        id: 'task-2',
        title: 'Task 1',
        boardId: 'board-1',
      }),
    ]);
    expect(result.cycleTime.sampleCount).toBe(1);
    expect(result.throughputByWeek).toHaveLength(1);
    expect(result.completionOnTime).toEqual({
      total: 1,
      onTime: 1,
      late: 0,
      onTimeRatio: 1,
    });
  });

  it('ignores invalid negative cycle durations', async () => {
    boardQueryBuilder.getRawMany.mockResolvedValue([{ id: 'board-1' }]);
    taskQueryBuilder.getMany.mockResolvedValue([
      createTask({
        id: 'task-1',
        isCompleted: true,
        createdAt: new Date('2026-06-20T00:00:00.000Z'),
        completedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    ]);

    const result = await service.dashboard('workspace-1', 'user-1', {});

    expect(result.cycleTime).toEqual({
      averageDays: null,
      sampleCount: 0,
    });
  });

  it('returns a burndown series when a board is selected', async () => {
    boardRepo.findOne!.mockResolvedValue({
      id: 'board-1',
      workspaceId: 'workspace-1',
    } as Board);
    taskQueryBuilder.getMany.mockResolvedValue([
      createTask({
        id: 'task-1',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        completedAt: new Date('2026-06-10T00:00:00.000Z'),
        isCompleted: true,
        storyPoints: 3,
      }),
      createTask({
        id: 'task-2',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        completedAt: null,
        isCompleted: false,
        storyPoints: null,
      }),
    ]);

    const result = await service.dashboard('workspace-1', 'user-1', {
      boardId: 'board-1',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    expect(result.burndown).not.toBeNull();
    expect(result.burndown?.boardId).toBe('board-1');
    expect(result.burndown?.remainingTasks.length).toBeGreaterThan(0);
  });
});
