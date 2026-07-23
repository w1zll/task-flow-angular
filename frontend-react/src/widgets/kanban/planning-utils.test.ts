import type { Board, Task } from '@/shared/api/api';
import {
  countTasksWithoutDueDate,
  createAgendaGroups,
  createCalendarMonthDays,
  createRollingMonths,
  getBoardPlanningTasks,
  groupTasksByDueDate,
  groupTasksByTeamAndMonth,
  groupTasksByWeek,
  toDateKey,
} from './planning-utils';

const createTask = (overrides: Partial<Task>): Task =>
  ({
    id: overrides.id ?? 'task',
    title: overrides.title ?? 'Task',
    priority: overrides.priority ?? 'medium',
    order: overrides.order ?? 0,
    labels: overrides.labels ?? [],
    dueDate: overrides.dueDate,
    assigneeId: overrides.assigneeId,
    teamId: overrides.teamId,
    team: overrides.team,
    isCompleted: overrides.isCompleted ?? false,
    columnId: overrides.columnId ?? 'column-1',
    createdAt: overrides.createdAt ?? '2026-07-01T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-01T10:00:00.000Z',
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
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  columns: [
    {
      id: 'column-1',
      title: 'Backlog',
      order: 0,
      boardId: 'board-1',
      tasks: [
        createTask({
          id: 'task-1',
          title: 'Past task',
          order: 0,
          dueDate: '2026-06-30T10:00:00.000Z',
          teamId: 'team-1',
        }),
        createTask({
          id: 'task-2',
          title: 'Today task',
          order: 1,
          dueDate: '2026-07-06',
          teamId: 'team-1',
        }),
        createTask({
          id: 'task-3',
          title: 'No due',
          order: 2,
        }),
      ],
    },
    {
      id: 'column-2',
      title: 'Done',
      order: 1,
      boardId: 'board-1',
      tasks: [
        createTask({
          id: 'task-4',
          title: 'Future task',
          order: 0,
          columnId: 'column-2',
          dueDate: '2026-08-03T10:00:00.000Z',
          teamId: null,
        }),
      ],
    },
  ],
} as Board;

describe('planning utils', () => {
  it('normalizes date keys and groups tasks by due date', () => {
    const tasks = getBoardPlanningTasks(board);
    const groups = groupTasksByDueDate(tasks);

    expect(toDateKey('2026-07-06T15:30:00.000Z')).toBe('2026-07-06');
    expect(groups.byDate['2026-07-06'].map((task) => task.id)).toEqual([
      'task-2',
    ]);
    expect(groups.noDueDate.map((task) => task.id)).toEqual(['task-3']);
  });

  it('creates agenda buckets for mobile calendar mode', () => {
    const agenda = createAgendaGroups(
      getBoardPlanningTasks(board),
      '2026-07-06',
    );

    expect(agenda.overdue.map((task) => task.id)).toEqual(['task-1']);
    expect(agenda.today.map((task) => task.id)).toEqual(['task-2']);
    expect(agenda.upcoming[0]).toMatchObject({
      dateKey: '2026-08-03',
      tasks: [expect.objectContaining({ id: 'task-4' })],
    });
    expect(agenda.noDueDate.map((task) => task.id)).toEqual(['task-3']);
  });

  it('builds rolling calendar ranges and planning group maps', () => {
    const tasks = getBoardPlanningTasks(board);
    const monthDays = createCalendarMonthDays('2026-07-06', 'en');
    const monthKeys = createRollingMonths('2026-07-06', 2).map((month) =>
      month.format('YYYY-MM'),
    );
    const weekKeys = ['2026-07-05', '2026-08-02'];

    expect(monthDays[0].format('YYYY-MM-DD')).toBe('2026-06-28');
    expect(monthDays.at(-1)?.format('YYYY-MM-DD')).toBe('2026-08-01');
    expect(
      groupTasksByWeek(tasks, weekKeys, 'en')['column-2']['2026-08-02'][0].id,
    ).toBe('task-4');
    expect(
      groupTasksByTeamAndMonth(tasks, monthKeys)['team-1']['2026-07'].map(
        (task) => task.id,
      ),
    ).toEqual(['task-2']);
    expect(countTasksWithoutDueDate(tasks)).toBe(1);
  });
});
