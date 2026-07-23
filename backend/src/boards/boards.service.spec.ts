import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Column } from '@/columns/entities/column.entity';
import { Task } from '@/tasks/entities/task.entity';
import { User } from '@/users/entities/user.entity';
import {
  BoardTemplate,
  getScrumColumnTitles,
} from './board-templates';
import { BoardMember } from './entities/board-member.entity';
import { Board } from './entities/board.entity';
import { BoardsService } from './boards.service';
import { FrontendCacheService } from '@/common/frontend-cache/frontend-cache.service';
import {
  BoardAccess,
  BoardPermissionsService,
} from './board-permissions.service';
import { BoardRole } from './entities/board-role.enum';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { BoardView } from './entities/board-view.entity';
import { BoardActivityEventsService } from './board-activity-events.service';
import { NotificationsService } from '@/notifications/notifications.service';

describe('BoardsService', () => {
  let service: BoardsService;
  let boardRepo: jest.Mocked<Partial<Repository<Board>>>;
  let memberRepo: jest.Mocked<Partial<Repository<BoardMember>>>;
  let boardViewRepo: jest.Mocked<Partial<Repository<BoardView>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let columnRepo: jest.Mocked<Partial<Repository<Column>>>;
  let taskRepo: jest.Mocked<Partial<Repository<Task>>>;
  let boardPermissions: jest.Mocked<Partial<BoardPermissionsService>>;
  let workspacesService: jest.Mocked<Partial<WorkspacesService>>;
  let boardActivityEvents: jest.Mocked<Partial<BoardActivityEventsService>>;
  let notificationsService: jest.Mocked<Partial<NotificationsService>>;
  let boardQueryBuilder: {
    leftJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    distinct: jest.Mock;
    getMany: jest.Mock;
  };

  const ownerAccess: BoardAccess = {
    role: BoardRole.OWNER,
    capabilities: {
      canReadBoard: true,
      canEditBoardContent: true,
      canManageBoardMembers: true,
      canDeleteBoard: true,
      canManageColumns: true,
      canUseWhiteboard: true,
      canManageBoardSettings: true,
    },
  };

  const createBoard = (overrides: Partial<Board> = {}) =>
    ({
      id: 'board-1',
      title: 'Board',
      description: null,
      color: '#669266',
      ownerId: 'user-1',
      workspaceId: 'workspace-1',
      columns: [],
      members: [],
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...overrides,
    }) as Board;

  beforeEach(async () => {
    boardQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    boardRepo = {
      create: jest.fn((data) => data as Board),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => boardQueryBuilder as any),
      save: jest.fn(async (board: Board) =>
        createBoard({
          ...board,
          id: board.id ?? 'board-1',
        }),
      ),
    };
    memberRepo = {
      findOne: jest.fn(),
      remove: jest.fn(),
      save: jest.fn(async (member: BoardMember) => member),
    };
    boardViewRepo = {
      create: jest.fn((data) => data as BoardView),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (view: BoardView) => ({
        ...view,
        id: view.id ?? 'view-1',
        createdAt: view.createdAt ?? new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: view.updatedAt ?? new Date('2026-06-01T00:00:00.000Z'),
      })),
      update: jest.fn(),
      remove: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    columnRepo = {
      create: jest.fn((data) => data as Column[]),
      save: jest.fn(async (columns: Column[]) =>
        columns.map(
          (column, index) =>
            ({
              ...column,
              id: `column-${index + 1}`,
              tasks: [],
            }) as Column,
        ),
      ),
    };
    taskRepo = {
      create: jest.fn((data) => data as Task[]),
      save: jest.fn(async (tasks: Task[]) => tasks),
    };
    boardPermissions = {
      getCapabilities: jest.fn(() => ({ ...ownerAccess.capabilities })),
      assertCanRead: jest.fn().mockResolvedValue(ownerAccess),
      assertCanManageBoardMembers: jest.fn().mockResolvedValue(ownerAccess),
      assertCanManageBoardSettings: jest.fn().mockResolvedValue(ownerAccess),
      assertCanDeleteBoard: jest.fn().mockResolvedValue(ownerAccess),
    };
    workspacesService = {
      getActiveWorkspace: jest.fn().mockResolvedValue({
        workspace: { id: 'workspace-1' },
        role: 'owner',
      }),
      assertMember: jest.fn().mockResolvedValue({
        workspace: { id: 'workspace-1' },
        role: 'owner',
      }),
    };
    boardActivityEvents = {
      logBoardCreated: jest.fn(),
      logBoardUpdated: jest.fn(),
      logBoardMemberInvited: jest.fn(),
      logBoardMemberRemoved: jest.fn(),
      logBoardMemberRoleChanged: jest.fn(),
    };
    notificationsService = {
      notifyBoardMemberAdded: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: getRepositoryToken(Board),
          useValue: boardRepo,
        },
        {
          provide: getRepositoryToken(BoardMember),
          useValue: memberRepo,
        },
        {
          provide: getRepositoryToken(BoardView),
          useValue: boardViewRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Column),
          useValue: columnRepo,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepo,
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
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an empty board by default', async () => {
    const board = await service.create({ title: 'Empty board' }, 'user-1');

    expect(boardRepo.create).toHaveBeenCalledWith({
      title: 'Empty board',
      ownerId: 'user-1',
      workspaceId: 'workspace-1',
    });
    expect(columnRepo.save).not.toHaveBeenCalled();
    expect(board.columns).toEqual([]);
  });

  it('lists all boards accessible to the user across workspaces', async () => {
    await service.findAll('user-1');

    expect(workspacesService.getActiveWorkspace).not.toHaveBeenCalled();
    expect(boardQueryBuilder.where).toHaveBeenCalledWith(
      '(board.ownerId = :userId OR member.userId = :userId)',
      { userId: 'user-1' },
    );
    expect(boardQueryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('creates a board in an explicitly selected workspace', async () => {
    workspacesService.assertMember!.mockResolvedValueOnce({
      workspace: { id: 'workspace-2' } as never,
      role: 'member' as never,
    });

    await service.create(
      {
        title: 'Design board',
        workspaceId: 'workspace-2',
      },
      'user-1',
    );

    expect(workspacesService.assertMember).toHaveBeenCalledWith(
      'workspace-2',
      'user-1',
    );
    expect(boardRepo.create).toHaveBeenCalledWith({
      title: 'Design board',
      ownerId: 'user-1',
      workspaceId: 'workspace-2',
    });
  });

  it('creates Scrum columns in order', async () => {
    const board = await service.create(
      { title: 'Scrum board', template: BoardTemplate.SCRUM },
      'user-1',
    );

    expect(columnRepo.create).toHaveBeenCalledWith(
      getScrumColumnTitles('en').map((title, order) => ({
        title,
        order,
        boardId: 'board-1',
      })),
    );
    expect(board.columns.map((column) => column.title)).toEqual(
      getScrumColumnTitles('en'),
    );
    expect(board.columns.map((column) => column.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('creates localized Scrum columns', async () => {
    const board = await service.create(
      { title: 'Scrum board', template: BoardTemplate.SCRUM },
      'user-1',
      'ru',
    );

    expect(board.columns.map((column) => column.title)).toEqual(
      getScrumColumnTitles('ru'),
    );
  });

  it('delegates board access checks to the permission service', async () => {
    await expect(
      service.ensureAccess('board-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(boardPermissions.assertCanRead).toHaveBeenCalledWith(
      'board-1',
      'user-1',
    );
  });

  it('passes through missing-board access errors', async () => {
    boardPermissions.assertCanRead!.mockRejectedValueOnce(
      new NotFoundException(),
    );

    await expect(
      service.ensureAccess('missing-board', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes through forbidden access errors', async () => {
    boardPermissions.assertCanRead!.mockRejectedValueOnce(
      new ForbiddenException(),
    );

    await expect(
      service.ensureAccess('board-1', 'user-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes a board member by membership id', async () => {
    const member = {
      id: 'membership-1',
      boardId: 'board-1',
      userId: 'user-2',
    } as BoardMember;
    memberRepo.findOne!.mockResolvedValue(member);

    await service.revokeMember('board-1', 'membership-1', 'user-1');

    expect(memberRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      relations: ['user'],
    });
    expect(memberRepo.remove).toHaveBeenCalledWith(member);
  });

  it('does not revoke a membership belonging to another board', async () => {
    memberRepo.findOne!.mockResolvedValue({
      id: 'membership-1',
      boardId: 'board-2',
      userId: 'user-2',
    } as BoardMember);

    await expect(
      service.revokeMember('board-1', 'membership-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(memberRepo.remove).not.toHaveBeenCalled();
  });

  it('allows the owner to change a member role', async () => {
    const member = {
      id: 'membership-1',
      boardId: 'board-1',
      userId: 'user-2',
      role: BoardRole.EDITOR,
      user: {
        id: 'user-2',
        email: 'member@example.com',
        name: 'Member',
      },
    } as BoardMember;
    memberRepo.findOne!.mockResolvedValue(member);

    const result = await service.updateMemberRole(
      'board-1',
      'membership-1',
      BoardRole.VIEWER,
      'user-1',
    );

    expect(boardPermissions.assertCanManageBoardMembers).toHaveBeenCalledWith(
      'board-1',
      'user-1',
    );
    expect(memberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: BoardRole.VIEWER }),
    );
    expect(result.role).toBe(BoardRole.VIEWER);
  });

  it('does not change a member role without member-management permission', async () => {
    boardPermissions.assertCanManageBoardMembers!.mockRejectedValueOnce(
      new ForbiddenException(),
    );

    await expect(
      service.updateMemberRole(
        'board-1',
        'membership-1',
        BoardRole.VIEWER,
        'editor-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(memberRepo.findOne).not.toHaveBeenCalled();
    expect(memberRepo.save).not.toHaveBeenCalled();
  });

  it('does not share a board with a user from another workspace', async () => {
    boardRepo.findOne!.mockResolvedValue(
      createBoard({ workspaceId: 'workspace-1' }),
    );
    userRepo.findOne!.mockResolvedValue({
      id: 'outside-user',
      email: 'outside@example.com',
    } as User);
    workspacesService.assertMember!.mockRejectedValueOnce(
      new ForbiddenException(),
    );

    await expect(
      service.share(
        'board-1',
        { email: 'outside@example.com' },
        'user-1',
      ),
    ).rejects.toThrow('The user must belong to the board workspace');

    expect(memberRepo.save).not.toHaveBeenCalled();
  });

  it('creates a saved board view for the current user', async () => {
    const result = await service.createView(
      'board-1',
      {
        title: 'My urgent tasks',
        filters: { assignee: 'me', priority: 'urgent' },
        sort: { sort: 'priority' },
        isDefault: true,
      },
      'user-1',
    );

    expect(boardPermissions.assertCanRead).toHaveBeenCalledWith(
      'board-1',
      'user-1',
    );
    expect(boardViewRepo.update).toHaveBeenCalledWith(
      { boardId: 'board-1', ownerId: 'user-1' },
      { isDefault: false },
    );
    expect(boardViewRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'board-1',
        ownerId: 'user-1',
        title: 'My urgent tasks',
        filters: { assignee: 'me', priority: 'urgent' },
        sort: { sort: 'priority' },
        isDefault: true,
      }),
    );
    expect(result.id).toBe('view-1');
  });

  it('does not delete another user saved board view', async () => {
    boardViewRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.deleteView('board-1', 'view-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(boardViewRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'view-1', boardId: 'board-1', ownerId: 'user-1' },
    });
    expect(boardViewRepo.remove).not.toHaveBeenCalled();
  });

  it('creates a welcome board with completed tasks relative to registration', async () => {
    const registeredAt = new Date('2026-06-10T12:00:00.000Z');

    const board = await service.createWelcomeBoard(
      'user-1',
      'workspace-1',
      registeredAt,
      'ru',
    );
    const savedTasks = (taskRepo.save as jest.Mock).mock.calls[0][0] as Task[];
    const completedTasks = savedTasks.filter((task) => task.isCompleted);

    expect(board.title).toBe('Добро пожаловать в TaskFlow');
    expect(board.columns.map((column) => column.title)).toEqual(
      getScrumColumnTitles('ru'),
    );
    expect(savedTasks[0].title).toBe('Изучите новое рабочее пространство');
    expect(savedTasks).toHaveLength(10);
    expect(completedTasks).toHaveLength(5);
    expect(completedTasks.map((task) => task.completedAt?.toISOString())).toEqual([
      '2026-06-10T11:00:00.000Z',
      '2026-06-09T12:00:00.000Z',
      '2026-06-02T12:00:00.000Z',
      '2026-05-26T12:00:00.000Z',
      '2026-05-06T12:00:00.000Z',
    ]);
  });
});
