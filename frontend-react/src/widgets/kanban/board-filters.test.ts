import { Board, Task } from '@/shared/api/api';
import {
  countActiveBoardFilters,
  DEFAULT_BOARD_FILTERS,
  boardFiltersFromSavedView,
  boardFiltersToSavedView,
  countBoardTasks,
  filterBoard,
  parseBoardFiltersFromSearchParams,
  writeBoardFiltersToSearchParams,
} from './board-filters';

const createTask = (overrides: Partial<Task>): Task =>
  ({
    id: overrides.id ?? 'task',
    title: overrides.title ?? 'Task',
    description: overrides.description,
    priority: overrides.priority ?? 'medium',
    order: overrides.order ?? 0,
    labels: overrides.labels ?? [],
    dueDate: overrides.dueDate,
    assigneeId: overrides.assigneeId,
    assigneeName: overrides.assigneeName,
    assignee: overrides.assignee,
    teamId: overrides.teamId,
    team: overrides.team,
    isCompleted: overrides.isCompleted ?? false,
    completedAt: overrides.completedAt,
    columnId: overrides.columnId ?? 'column-1',
    createdAt: overrides.createdAt ?? '2026-06-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-06-01T10:00:00.000Z',
  }) as Task;

const board = {
  id: 'board-1',
  title: 'Board',
  color: '#669266',
  ownerId: 'user-1',
  workspaceId: 'workspace-1',
  currentUserRole: 'owner',
  capabilities: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: true,
    canDeleteBoard: true,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: true,
  },
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
  columns: [
    {
      id: 'column-1',
      title: 'Backlog',
      order: 0,
      boardId: 'board-1',
      tasks: [
        createTask({
          id: 'task-1',
          title: 'Fix login bug',
          description: 'OAuth issue',
          priority: 'urgent',
          order: 0,
          labels: ['bug', 'backend'],
          assigneeId: 'user-1',
          teamId: 'team-1',
          dueDate: '2026-05-01T10:00:00.000Z',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-05T10:00:00.000Z',
        }),
        createTask({
          id: 'task-2',
          title: 'Design empty state',
          priority: 'low',
          order: 1,
          labels: ['design'],
          assigneeId: 'user-2',
          teamId: 'team-2',
          createdAt: '2026-06-03T10:00:00.000Z',
          updatedAt: '2026-06-04T10:00:00.000Z',
        }),
        createTask({
          id: 'task-3',
          title: 'Write release notes',
          priority: 'high',
          order: 2,
          labels: ['docs'],
          isCompleted: true,
          createdAt: '2026-06-02T10:00:00.000Z',
          updatedAt: '2026-06-06T10:00:00.000Z',
        }),
      ],
    },
  ],
} as Board;

describe('board filters', () => {
  it('counts active filter groups for the mobile tools badge', () => {
    expect(countActiveBoardFilters(DEFAULT_BOARD_FILTERS)).toBe(0);
    expect(
      countActiveBoardFilters({
        ...DEFAULT_BOARD_FILTERS,
        search: 'bug',
        labels: ['backend', 'urgent'],
        sort: 'priority',
      }),
    ).toBe(3);
  });

  it('filters tasks by search, labels, assignee and team', () => {
    const result = filterBoard(
      board,
      {
        ...DEFAULT_BOARD_FILTERS,
        search: 'login',
        labels: ['bug'],
        assignee: 'me',
        team: 'my',
      },
      { currentUserId: 'user-1', myTeamIds: ['team-1'] },
    );

    expect(result.columns?.[0].tasks?.map((task) => task.id)).toEqual([
      'task-1',
    ]);
  });

  it('filters by status and priority', () => {
    const completedHighTasks = filterBoard(board, {
      ...DEFAULT_BOARD_FILTERS,
      status: 'completed',
      priority: 'high',
    });

    expect(completedHighTasks.columns?.[0].tasks?.map((task) => task.id)).toEqual(
      ['task-3'],
    );
  });

  it('sorts visible tasks by priority', () => {
    const result = filterBoard(board, {
      ...DEFAULT_BOARD_FILTERS,
      sort: 'priority',
    });

    expect(result.columns?.[0].tasks?.map((task) => task.id)).toEqual([
      'task-1',
      'task-3',
      'task-2',
    ]);
  });

  it('filters tasks with unread notifications', () => {
    const result = filterBoard(
      board,
      {
        ...DEFAULT_BOARD_FILTERS,
        unread: true,
      },
      { unreadTaskIds: ['task-2'] },
    );

    expect(result.columns?.[0].tasks?.map((task) => task.id)).toEqual([
      'task-2',
    ]);
  });

  it('parses and writes URL search params without dropping unrelated params', () => {
    const initial = new URLSearchParams(
      'taskId=task-1&q=bug&priority=urgent&labels=bug,backend&unread=1',
    );
    const parsed = parseBoardFiltersFromSearchParams(initial);
    const next = writeBoardFiltersToSearchParams(
      { ...parsed, priority: 'all' },
      initial,
    );

    expect(parsed.search).toBe('bug');
    expect(parsed.labels).toEqual(['bug', 'backend']);
    expect(parsed.unread).toBe(true);
    expect(next.get('taskId')).toBe('task-1');
    expect(next.get('priority')).toBeNull();
  });

  it('counts tasks across board columns', () => {
    expect(countBoardTasks(board)).toBe(3);
  });

  it('serializes and restores saved view filters', () => {
    const filters = {
      ...DEFAULT_BOARD_FILTERS,
      assignee: 'me',
      team: 'my',
      labels: ['bug'],
      sort: 'priority' as const,
    };

    const savedView = boardFiltersToSavedView(filters);
    const restored = boardFiltersFromSavedView(
      savedView.filters,
      savedView.sort,
    );

    expect(restored).toEqual(filters);
  });
});
