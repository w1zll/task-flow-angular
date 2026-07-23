import { Board, Task } from '@/shared/api/api';
import dayjs from 'dayjs';

export const BOARD_FILTER_QUERY_KEYS = [
  'q',
  'assignee',
  'team',
  'priority',
  'status',
  'labels',
  'sort',
  'unread',
] as const;

export type BoardTaskPriority = Task['priority'];

export type BoardTaskStatusFilter =
  | 'all'
  | 'open'
  | 'completed'
  | 'overdue'
  | 'noDueDate'
  | 'dueToday'
  | 'dueWeek';

export type BoardTaskSort =
  | 'manual'
  | 'dueDate'
  | 'priority'
  | 'createdAt'
  | 'updatedAt'
  | 'assignee';

export interface BoardFilters {
  search: string;
  assignee: 'all' | 'me' | 'unassigned' | string;
  team: 'all' | 'my' | string;
  priority: 'all' | BoardTaskPriority;
  status: BoardTaskStatusFilter;
  labels: string[];
  sort: BoardTaskSort;
  unread: boolean;
}

export interface BoardFilterContext {
  currentUserId?: string;
  myTeamIds?: string[];
  unreadTaskIds?: string[];
}

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  search: '',
  assignee: 'all',
  team: 'all',
  priority: 'all',
  status: 'all',
  labels: [],
  sort: 'manual',
  unread: false,
};

const PRIORITY_WEIGHT: Record<BoardTaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const VALID_STATUSES = new Set<BoardTaskStatusFilter>([
  'all',
  'open',
  'completed',
  'overdue',
  'noDueDate',
  'dueToday',
  'dueWeek',
]);

const VALID_PRIORITIES = new Set<BoardFilters['priority']>([
  'all',
  'low',
  'medium',
  'high',
  'urgent',
]);

const VALID_SORTS = new Set<BoardTaskSort>([
  'manual',
  'dueDate',
  'priority',
  'createdAt',
  'updatedAt',
  'assignee',
]);

const normalizeLabel = (label: string) => label.trim().toLowerCase();

const normalizeNullableDate = (value?: string | null) =>
  value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;

const getAssigneeName = (task: Task) =>
  (task.assignee?.name ?? task.assigneeName ?? '').toLowerCase();

export const areBoardFiltersActive = (filters: BoardFilters) =>
  filters.search.trim() !== '' ||
  filters.assignee !== DEFAULT_BOARD_FILTERS.assignee ||
  filters.team !== DEFAULT_BOARD_FILTERS.team ||
  filters.priority !== DEFAULT_BOARD_FILTERS.priority ||
  filters.status !== DEFAULT_BOARD_FILTERS.status ||
  filters.labels.length > 0 ||
  filters.sort !== DEFAULT_BOARD_FILTERS.sort ||
  filters.unread !== DEFAULT_BOARD_FILTERS.unread;

export const countActiveBoardFilters = (filters: BoardFilters) =>
  [
    filters.search.trim() !== '',
    filters.assignee !== DEFAULT_BOARD_FILTERS.assignee,
    filters.team !== DEFAULT_BOARD_FILTERS.team,
    filters.priority !== DEFAULT_BOARD_FILTERS.priority,
    filters.status !== DEFAULT_BOARD_FILTERS.status,
    filters.labels.length > 0,
    filters.sort !== DEFAULT_BOARD_FILTERS.sort,
    filters.unread !== DEFAULT_BOARD_FILTERS.unread,
  ].filter(Boolean).length;

export const isBoardReorderDisabledByView = (filters: BoardFilters) =>
  areBoardFiltersActive(filters);

export const parseBoardFiltersFromSearchParams = (
  searchParams: URLSearchParams,
): BoardFilters => {
  const status = searchParams.get('status') as BoardTaskStatusFilter | null;
  const priority = searchParams.get('priority') as
    | BoardFilters['priority']
    | null;
  const sort = searchParams.get('sort') as BoardTaskSort | null;

  return {
    search: searchParams.get('q') ?? '',
    assignee: searchParams.get('assignee') ?? DEFAULT_BOARD_FILTERS.assignee,
    team: searchParams.get('team') ?? DEFAULT_BOARD_FILTERS.team,
    priority:
      priority && VALID_PRIORITIES.has(priority)
        ? priority
        : DEFAULT_BOARD_FILTERS.priority,
    status:
      status && VALID_STATUSES.has(status)
        ? status
        : DEFAULT_BOARD_FILTERS.status,
    labels: (searchParams.get('labels') ?? '')
      .split(',')
      .map(normalizeLabel)
      .filter(Boolean),
    sort: sort && VALID_SORTS.has(sort) ? sort : DEFAULT_BOARD_FILTERS.sort,
    unread: searchParams.get('unread') === '1',
  };
};

export const writeBoardFiltersToSearchParams = (
  filters: BoardFilters,
  searchParams: URLSearchParams,
) => {
  const next = new URLSearchParams(searchParams.toString());

  BOARD_FILTER_QUERY_KEYS.forEach((key) => next.delete(key));

  if (filters.search.trim()) next.set('q', filters.search.trim());
  if (filters.assignee !== DEFAULT_BOARD_FILTERS.assignee) {
    next.set('assignee', filters.assignee);
  }
  if (filters.team !== DEFAULT_BOARD_FILTERS.team) {
    next.set('team', filters.team);
  }
  if (filters.priority !== DEFAULT_BOARD_FILTERS.priority) {
    next.set('priority', filters.priority);
  }
  if (filters.status !== DEFAULT_BOARD_FILTERS.status) {
    next.set('status', filters.status);
  }
  if (filters.labels.length > 0) {
    next.set('labels', filters.labels.map(normalizeLabel).join(','));
  }
  if (filters.sort !== DEFAULT_BOARD_FILTERS.sort) {
    next.set('sort', filters.sort);
  }
  if (filters.unread) {
    next.set('unread', '1');
  }

  return next;
};

export const boardFiltersToSavedView = (filters: BoardFilters) => ({
  filters: {
    search: filters.search,
    assignee: filters.assignee,
    team: filters.team,
    priority: filters.priority,
    status: filters.status,
    labels: filters.labels,
    unread: filters.unread,
  },
  sort: {
    sort: filters.sort,
  },
});

export const boardFiltersFromSavedView = (
  filters: Record<string, unknown>,
  sort: Record<string, unknown>,
): BoardFilters => ({
  ...DEFAULT_BOARD_FILTERS,
  search: typeof filters.search === 'string' ? filters.search : '',
  assignee: typeof filters.assignee === 'string' ? filters.assignee : 'all',
  team: typeof filters.team === 'string' ? filters.team : 'all',
  priority:
    typeof filters.priority === 'string' &&
    VALID_PRIORITIES.has(filters.priority as BoardFilters['priority'])
      ? (filters.priority as BoardFilters['priority'])
      : 'all',
  status:
    typeof filters.status === 'string' &&
    VALID_STATUSES.has(filters.status as BoardTaskStatusFilter)
      ? (filters.status as BoardTaskStatusFilter)
      : 'all',
  labels: Array.isArray(filters.labels)
    ? filters.labels.filter(
        (label): label is string => typeof label === 'string',
      )
    : [],
  unread: filters.unread === true,
  sort:
    typeof sort.sort === 'string' && VALID_SORTS.has(sort.sort as BoardTaskSort)
      ? (sort.sort as BoardTaskSort)
      : 'manual',
});

const matchesSearch = (task: Task, search: string) => {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return (
    task.title.toLowerCase().includes(needle) ||
    (task.description ?? '').toLowerCase().includes(needle)
  );
};

const matchesAssignee = (
  task: Task,
  assignee: BoardFilters['assignee'],
  currentUserId?: string,
) => {
  if (assignee === 'all') return true;
  if (assignee === 'unassigned') return !task.assigneeId && !task.assignee;
  if (assignee === 'me') {
    return Boolean(
      currentUserId &&
        (task.assigneeId === currentUserId ||
          task.assignee?.id === currentUserId),
    );
  }

  return task.assigneeId === assignee || task.assignee?.id === assignee;
};

const matchesTeam = (
  task: Task,
  team: BoardFilters['team'],
  myTeamIds: string[] = [],
) => {
  if (team === 'all') return true;
  if (team === 'my') return Boolean(task.teamId && myTeamIds.includes(task.teamId));

  return task.teamId === team || task.team?.id === team;
};

const matchesStatus = (task: Task, status: BoardTaskStatusFilter) => {
  const now = dayjs();
  const dueDate = task.dueDate ? dayjs(task.dueDate) : null;

  switch (status) {
    case 'open':
      return !task.isCompleted;
    case 'completed':
      return !!task.isCompleted;
    case 'overdue':
      return !task.isCompleted && !!dueDate && dueDate.isBefore(now, 'day');
    case 'noDueDate':
      return !task.dueDate;
    case 'dueToday':
      return !task.isCompleted && !!dueDate && dueDate.isSame(now, 'day');
    case 'dueWeek':
      return (
        !task.isCompleted &&
        !!dueDate &&
        (dueDate.isSame(now, 'day') ||
          (dueDate.isAfter(now, 'day') &&
            dueDate.isBefore(now.add(7, 'day'), 'day')))
      );
    case 'all':
    default:
      return true;
  }
};

const matchesLabels = (task: Task, labels: string[]) => {
  if (labels.length === 0) return true;

  const taskLabels = new Set((task.labels ?? []).map(normalizeLabel));
  return labels.every((label) => taskLabels.has(normalizeLabel(label)));
};

const matchesUnread = (task: Task, unread: boolean, unreadTaskIds: string[]) => {
  if (!unread) return true;
  return unreadTaskIds.includes(task.id);
};

const compareTasks = (a: Task, b: Task, sort: BoardTaskSort) => {
  switch (sort) {
    case 'dueDate':
      return normalizeNullableDate(a.dueDate) - normalizeNullableDate(b.dueDate);
    case 'priority':
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    case 'createdAt':
      return normalizeNullableDate(a.createdAt) - normalizeNullableDate(b.createdAt);
    case 'updatedAt':
      return normalizeNullableDate(b.updatedAt) - normalizeNullableDate(a.updatedAt);
    case 'assignee':
      return getAssigneeName(a).localeCompare(getAssigneeName(b));
    case 'manual':
    default:
      return a.order - b.order;
  }
};

export const filterBoard = (
  board: Board,
  filters: BoardFilters,
  context: BoardFilterContext = {},
): Board => ({
  ...board,
  columns: board.columns?.map((column) => ({
    ...column,
    tasks: (column.tasks ?? [])
      .filter(
        (task) =>
          matchesSearch(task, filters.search) &&
          matchesAssignee(task, filters.assignee, context.currentUserId) &&
          matchesTeam(task, filters.team, context.myTeamIds) &&
          (filters.priority === 'all' || task.priority === filters.priority) &&
          matchesStatus(task, filters.status) &&
          matchesLabels(task, filters.labels) &&
          matchesUnread(task, filters.unread, context.unreadTaskIds ?? []),
      )
      .sort((a, b) => compareTasks(a, b, filters.sort)),
  })),
});

export const countBoardTasks = (board?: Board) =>
  board?.columns?.reduce(
    (count, column) => count + (column.tasks?.length ?? 0),
    0,
  ) ?? 0;
