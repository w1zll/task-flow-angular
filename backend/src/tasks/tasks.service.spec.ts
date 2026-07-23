import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Board } from '@/boards/entities/board.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Column } from '@/columns/entities/column.entity';
import { User } from '@/users/entities/user.entity';
import { Task, TaskPriority } from './entities/task.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { TasksService } from './tasks.service';
import { FrontendCacheService } from '@/common/frontend-cache/frontend-cache.service';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { Team } from '@/teams/entities/team.entity';
import { BoardActivityEventsService } from '@/boards/board-activity-events.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { STORAGE_ADAPTER } from '@/storage/storage.types';
import { LocalStorageAdapter } from '@/storage/local-storage.adapter';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: jest.Mocked<Partial<Repository<Task>>>;
  let checklistRepo: jest.Mocked<Partial<Repository<TaskChecklistItem>>>;
  let attachmentRepo: jest.Mocked<Partial<Repository<TaskAttachment>>>;
  let columnRepo: jest.Mocked<Partial<Repository<Column>>>;
  let boardRepo: jest.Mocked<Partial<Repository<Board>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let teamRepo: jest.Mocked<Partial<Repository<Team>>>;
  let boardPermissions: jest.Mocked<Partial<BoardPermissionsService>>;
  let workspacesService: jest.Mocked<Partial<WorkspacesService>>;
  let boardActivityEvents: jest.Mocked<Partial<BoardActivityEventsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let storageAdapter: {
    provider: 'local';
    uploadAvatar: jest.Mock;
    deleteAvatar: jest.Mock;
    uploadAttachment: jest.Mock;
    deleteAttachment: jest.Mock;
  };
  let localStorage: {
    readAttachment: jest.Mock;
    deleteAttachment: jest.Mock;
  };
  let mockQueryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    innerJoin: jest.Mock;
    leftJoin: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    groupBy: jest.Mock;
    orderBy: jest.Mock;
    getRawMany: jest.Mock;
    getRawOne: jest.Mock;
    execute: jest.Mock;
  };

  const userId = 'user-1';

  const createTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: 'task-1',
      title: 'Task',
      description: null,
      priority: TaskPriority.MEDIUM,
      order: 0,
      labels: [],
      dueDate: null,
      assigneeName: null,
      assigneeId: null,
      assignee: null,
      isCompleted: false,
      completedAt: null,
      columnId: 'column-1',
      column: {
        id: 'column-1',
        boardId: 'board-1',
        board: {
          id: 'board-1',
          ownerId: userId,
          workspaceId: 'workspace-1',
          members: [],
        },
      },
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...overrides,
    }) as Task;

  beforeEach(async () => {
    mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
      execute: jest.fn().mockResolvedValue({}),
    };
    taskRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((data) => data as Task),
      createQueryBuilder: jest.fn(() => mockQueryBuilder as any),
      save: jest.fn(async (task: Task) => task),
      update: jest.fn().mockResolvedValue({}),
    };
    checklistRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => data as TaskChecklistItem),
      save: jest.fn(async (item: TaskChecklistItem) => item),
      update: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };
    attachmentRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data as TaskAttachment),
      createQueryBuilder: jest.fn(() => mockQueryBuilder as any),
      save: jest.fn(async (attachment: TaskAttachment) => attachment),
      remove: jest.fn().mockResolvedValue({}),
    };
    columnRepo = {
      findOne: jest.fn(),
    };
    boardRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    teamRepo = {
      findOne: jest.fn(),
    };
    boardPermissions = {
      assertCanEditBoardContent: jest.fn().mockResolvedValue({
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
    workspacesService = {
      assertMember: jest.fn().mockResolvedValue({
        workspace: { id: 'workspace-1' },
        role: 'member',
      }),
    };
    boardActivityEvents = {
      logTaskCreated: jest.fn(),
      logTaskUpdated: jest.fn(),
      logTaskCompleted: jest.fn(),
      logTaskMoved: jest.fn(),
      logTaskReordered: jest.fn(),
      logTaskDeleted: jest.fn(),
    };
    notificationsService = {
      emitTaskCreated: jest.fn(),
      emitTaskDeleted: jest.fn(),
      notifyTaskAssigned: jest.fn(),
      notifyTeamTaskChanged: jest.fn(),
    };
    storageAdapter = {
      provider: 'local',
      uploadAvatar: jest.fn(),
      deleteAvatar: jest.fn(),
      uploadAttachment: jest.fn(),
      deleteAttachment: jest.fn(),
    };
    localStorage = {
      readAttachment: jest.fn(),
      deleteAttachment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepo,
        },
        {
          provide: getRepositoryToken(TaskChecklistItem),
          useValue: checklistRepo,
        },
        {
          provide: getRepositoryToken(TaskAttachment),
          useValue: attachmentRepo,
        },
        {
          provide: getRepositoryToken(Column),
          useValue: columnRepo,
        },
        {
          provide: getRepositoryToken(Board),
          useValue: boardRepo,
        },
        {
          provide: getRepositoryToken(BoardMember),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: teamRepo,
        },
        {
          provide: FrontendCacheService,
          useValue: { revalidateBoard: jest.fn() },
        },
        {
          provide: BoardPermissionsService,
          useValue: boardPermissions,
        },
        {
          provide: WorkspacesService,
          useValue: workspacesService,
        },
        {
          provide: BoardActivityEventsService,
          useValue: boardActivityEvents,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: STORAGE_ADAPTER,
          useValue: storageAdapter,
        },
        {
          provide: LocalStorageAdapter,
          useValue: localStorage,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const expectCompletionAnalyticsAccessQuery = () => {
    expect(taskRepo.createQueryBuilder).toHaveBeenCalledWith('task');
    expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
      'task.column',
      'column',
    );
    expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
      'column.board',
      'board',
    );
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
      'board.members',
      'member',
      'member.userId = :userId',
      { userId },
    );
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'task.isCompleted = true',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.completedAt IS NOT NULL',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      '(board.ownerId = :userId OR member.userId = :userId)',
      { userId },
    );
  };

  it('creates a task without a due date as null', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      boardId: 'board-1',
      board: {
        id: 'board-1',
        ownerId: userId,
        workspaceId: 'workspace-1',
        members: [],
      },
    } as Column);

    const result = await service.create(
      {
        title: 'Task without deadline',
        columnId: 'column-1',
      },
      userId,
    );

    expect(taskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task without deadline',
        columnId: 'column-1',
        dueDate: null,
      }),
    );
    expect(result.dueDate).toBeNull();
    expect(boardPermissions.assertCanEditBoardContent).toHaveBeenCalledWith(
      'board-1',
      userId,
    );
  });

  it('does not allow a viewer to create a task', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      boardId: 'board-1',
    } as Column);
    boardPermissions.assertCanEditBoardContent!.mockRejectedValueOnce(
      new ForbiddenException(),
    );

    await expect(
      service.create(
        {
          title: 'Forbidden task',
          columnId: 'column-1',
        },
        'viewer-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it('does not assign a task to a user from another workspace', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      boardId: 'board-1',
    } as Column);
    userRepo.findOne!.mockResolvedValue({
      id: 'outside-user',
      name: 'Outside User',
    } as User);
    boardRepo.findOne!.mockResolvedValue({
      id: 'board-1',
      ownerId: 'outside-user',
      workspaceId: 'workspace-1',
      members: [],
    } as Board);
    workspacesService.assertMember!.mockRejectedValueOnce(
      new ForbiddenException(),
    );

    await expect(
      service.create(
        {
          title: 'Cross-workspace assignment',
          columnId: 'column-1',
          assigneeId: 'outside-user',
        },
        userId,
      ),
    ).rejects.toThrow('Assignee must belong to the board workspace');

    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it('assigns a task to a team from the board workspace', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      boardId: 'board-1',
    } as Column);
    boardRepo.findOne!.mockResolvedValue({
      id: 'board-1',
      workspaceId: 'workspace-1',
    } as Board);
    teamRepo.findOne!.mockResolvedValue({
      id: 'team-1',
      name: 'Design',
      workspaceId: 'workspace-1',
    } as Team);

    const result = await service.create(
      {
        title: 'Design task',
        columnId: 'column-1',
        teamId: 'team-1',
      },
      userId,
    );

    expect(taskRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team-1',
        team: expect.objectContaining({ id: 'team-1' }),
      }),
    );
    expect(result.teamId).toBe('team-1');
  });

  it('does not assign a task to a team from another workspace', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      boardId: 'board-1',
    } as Column);
    boardRepo.findOne!.mockResolvedValue({
      id: 'board-1',
      workspaceId: 'workspace-1',
    } as Board);
    teamRepo.findOne!.mockResolvedValue({
      id: 'team-2',
      workspaceId: 'workspace-2',
    } as Team);

    await expect(
      service.create(
        {
          title: 'Cross-workspace team task',
          columnId: 'column-1',
          teamId: 'team-2',
        },
        userId,
      ),
    ).rejects.toThrow('Task team must belong to the board workspace');

    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it('sets completedAt when completing a task without a timestamp', async () => {
    const now = new Date('2026-06-08T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    taskRepo.findOne.mockResolvedValue(createTask());

    const result = await service.update('task-1', { isCompleted: true }, userId);

    expect(result.isCompleted).toBe(true);
    expect(result.completedAt).toEqual(now);
    expect(taskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: true,
        completedAt: now,
        order: 0,
      }),
    );
    expect(boardActivityEvents.logTaskCompleted).toHaveBeenCalledWith(
      'board-1',
      userId,
      expect.objectContaining({
        taskId: 'task-1',
        title: 'Task',
        changes: [
          {
            field: 'isCompleted',
            from: false,
            to: true,
          },
        ],
      }),
    );
    expect(boardActivityEvents.logTaskUpdated).not.toHaveBeenCalled();
  });

  it('clears completedAt when un-completing a task', async () => {
    taskRepo.findOne.mockResolvedValue(
      createTask({
        isCompleted: true,
        completedAt: new Date('2026-06-07T10:00:00.000Z'),
      }),
    );

    const result = await service.update(
      'task-1',
      { isCompleted: false },
      userId,
    );

    expect(result.isCompleted).toBe(false);
    expect(result.completedAt).toBeNull();
    expect(taskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: false,
        completedAt: null,
      }),
    );
  });

  it('preserves completedAt during unrelated task updates', async () => {
    const completedAt = new Date('2026-06-07T10:00:00.000Z');
    taskRepo.findOne.mockResolvedValue(
      createTask({
        isCompleted: true,
        completedAt,
      }),
    );

    const result = await service.update(
      'task-1',
      { title: 'Renamed task' },
      userId,
    );

    expect(result.title).toBe('Renamed task');
    expect(result.isCompleted).toBe(true);
    expect(result.completedAt).toBe(completedAt);
    expect(taskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renamed task',
        completedAt,
      }),
    );
  });

  it('keeps the original completedAt when completing an already completed task', async () => {
    const completedAt = new Date('2026-06-07T10:00:00.000Z');
    taskRepo.findOne.mockResolvedValue(
      createTask({
        isCompleted: true,
        completedAt,
      }),
    );

    const result = await service.update('task-1', { isCompleted: true }, userId);

    expect(result.isCompleted).toBe(true);
    expect(result.completedAt).toBe(completedAt);
    expect(taskRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('moves a newly completed task to the end of its column', async () => {
    taskRepo.count.mockResolvedValue(3);
    taskRepo.findOne.mockResolvedValue(
      createTask({
        order: 0,
      }),
    );

    const result = await service.update('task-1', { isCompleted: true }, userId);

    expect(result.isCompleted).toBe(true);
    expect(result.order).toBe(2);
    expect(mockQueryBuilder.update).toHaveBeenCalledWith(Task);
    expect(mockQueryBuilder.set).toHaveBeenCalledWith({
      order: expect.any(Function),
    });
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      '"columnId" = :columnId AND "order" > :sourceOrder AND "order" <= :lastOrder',
      {
        columnId: 'column-1',
        sourceOrder: 0,
        lastOrder: 2,
      },
    );
    expect(mockQueryBuilder.execute).toHaveBeenCalled();
    expect(taskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: true,
        order: 2,
      }),
    );
  });

  it('rejects a stale queued move when the task source column changed', async () => {
    taskRepo.findOne.mockResolvedValue(
      createTask({
        columnId: 'column-2',
        column: {
          id: 'column-2',
          boardId: 'board-1',
          board: {
            id: 'board-1',
            ownerId: userId,
            workspaceId: 'workspace-1',
            members: [],
          },
        } as Column,
      }),
    );

    await expect(
      service.move(
        'task-1',
        { columnId: 'column-3', order: 0 },
        userId,
        'board-1',
        'column-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(columnRepo.findOne).not.toHaveBeenCalled();
    expect(taskRepo.update).not.toHaveBeenCalled();
  });

  it('rejects stale queued reorder when the column task list changed', async () => {
    columnRepo.findOne!.mockResolvedValue({
      id: 'column-1',
      title: 'Todo',
      boardId: 'board-1',
    } as Column);
    taskRepo.find!.mockResolvedValue([createTask()]);

    await expect(
      service.reorder(
        { taskIds: ['task-1', 'task-2'] },
        'column-1',
        userId,
        'board-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(taskRepo.update).not.toHaveBeenCalled();
    expect(boardActivityEvents.logTaskReordered).not.toHaveBeenCalled();
  });

  it('returns task ids grouped by final column order', async () => {
    taskRepo.find!.mockResolvedValue([
      createTask({ id: 'task-1', columnId: 'column-1', order: 0 }),
      createTask({ id: 'task-2', columnId: 'column-1', order: 1 }),
      createTask({ id: 'task-3', columnId: 'column-2', order: 0 }),
    ]);

    const result = await service.getTaskIdsByColumn([
      'column-1',
      'column-2',
      'column-1',
      undefined,
    ]);

    expect(taskRepo.find).toHaveBeenCalledWith({
      where: { columnId: expect.anything() },
      select: { id: true, columnId: true, order: true },
      order: { columnId: 'ASC', order: 'ASC', id: 'ASC' },
    });
    expect(result).toEqual({
      'column-1': ['task-1', 'task-2'],
      'column-2': ['task-3'],
    });
  });

  it('returns daily analytics with access and board/date filters', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([
      { period: '2026-06-01', count: '2' },
      { period: '2026-06-02', count: '1' },
    ]);

    const result = await service.getDailyAnalytics(userId, {
      boardId: 'board-1',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    expect(result).toEqual([
      { period: '2026-06-01', count: 2 },
      { period: '2026-06-02', count: 1 },
    ]);
    expectCompletionAnalyticsAccessQuery();
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'board.id = :boardId',
      { boardId: 'board-1' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.completedAt >= :fromDate',
      { fromDate: new Date('2026-06-01') },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.completedAt <= :toDate',
      { toDate: new Date('2026-06-30') },
    );
    expect(mockQueryBuilder.select).toHaveBeenCalledWith(
      "TO_CHAR(DATE_TRUNC('day', task.completedAt), 'YYYY-MM-DD')",
      'period',
    );
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(*)',
      'count',
    );
    expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('period');
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('period', 'ASC');
  });

  it('returns weekly analytics grouped by week start date', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([
      { period: '2026-06-01', count: '3' },
    ]);

    const result = await service.getWeeklyAnalytics(userId, {});

    expect(result).toEqual([{ period: '2026-06-01', count: 3 }]);
    expectCompletionAnalyticsAccessQuery();
    expect(mockQueryBuilder.select).toHaveBeenCalledWith(
      "TO_CHAR(DATE_TRUNC('week', task.completedAt), 'YYYY-MM-DD')",
      'period',
    );
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(*)',
      'count',
    );
    expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('period');
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('period', 'ASC');
  });

  it('returns monthly analytics grouped by month', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValue([
      { period: '2026-06', count: '4' },
    ]);

    const result = await service.getMonthlyAnalytics(userId, {});

    expect(result).toEqual([{ period: '2026-06', count: 4 }]);
    expectCompletionAnalyticsAccessQuery();
    expect(mockQueryBuilder.select).toHaveBeenCalledWith(
      "TO_CHAR(DATE_TRUNC('month', task.completedAt), 'YYYY-MM')",
      'period',
    );
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(*)',
      'count',
    );
    expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('period');
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('period', 'ASC');
  });

  it('returns completion summary analytics', async () => {
    mockQueryBuilder.getRawOne.mockResolvedValue({
      total: '5',
      onTime: '3',
      late: '2',
    });

    const result = await service.getCompletionSummary(userId, {
      boardId: 'board-1',
    });

    expect(result).toEqual({ total: 5, onTime: 3, late: 2 });
    expectCompletionAnalyticsAccessQuery();
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'board.id = :boardId',
      { boardId: 'board-1' },
    );
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('COUNT(*)', 'total');
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'SUM(CASE WHEN task.dueDate IS NULL OR task.completedAt <= task.dueDate THEN 1 ELSE 0 END)',
      'onTime',
    );
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'SUM(CASE WHEN task.dueDate IS NOT NULL AND task.completedAt > task.dueDate THEN 1 ELSE 0 END)',
      'late',
    );
  });
});
