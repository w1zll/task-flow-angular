import type { Board, Task } from '@/shared/api/api';
import type {
  BoardSocketEvent,
  PendingBoardMutation,
} from '@/shared/store/pending-board-mutations.store';

type Translate = (key: string, values?: Record<string, unknown>) => string;

type PendingMutationDescription = {
  title: string;
  lines: string[];
};

type PendingMutationPayload = {
  taskId?: unknown;
  columnId?: unknown;
  sourceColumnId?: unknown;
  order?: unknown;
  taskIds?: unknown;
  changes?: unknown;
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'field.title',
  description: 'field.description',
  priority: 'field.priority',
  labels: 'field.labels',
  dueDate: 'field.dueDate',
  assigneeId: 'field.assignee',
  assigneeName: 'field.assignee',
  teamId: 'field.team',
  isCompleted: 'field.isCompleted',
  completedAt: 'field.completedAt',
  estimateMinutes: 'field.estimateMinutes',
  storyPoints: 'field.storyPoints',
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  urgent: 'priority.urgent',
};

const IGNORED_UPDATE_FIELDS = new Set([
  'id',
  'boardId',
  'taskId',
  'columnId',
  'idempotencyKey',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asPayload = (payload: unknown): PendingMutationPayload =>
  isRecord(payload) ? payload : {};

const asChanges = (changes: unknown): Record<string, unknown> =>
  isRecord(changes) ? changes : {};

const asString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

const findTask = (board: Board | undefined, taskId?: unknown) => {
  const id = asString(taskId);
  if (!id) return undefined;

  return board?.columns
    ?.flatMap((column) => column.tasks ?? [])
    .find((task) => task.id === id);
};

const findColumnTitle = (board: Board | undefined, columnId?: unknown) => {
  const id = asString(columnId);
  if (!id) return undefined;

  return board?.columns?.find((column) => column.id === id)?.title ?? id;
};

const findTaskTitle = (board: Board | undefined, taskId?: unknown) => {
  const id = asString(taskId);
  if (!id) return undefined;

  return (
    board?.columns
      ?.flatMap((column) => column.tasks ?? [])
      .find((task) => task.id === id)?.title ?? id
  );
};

const findMemberName = (board: Board | undefined, userId?: unknown) => {
  const id = asString(userId);
  if (!id) return undefined;

  return board?.members?.find((member) => member.userId === id)?.user?.name ?? id;
};

const findTeamName = (board: Board | undefined, teamId?: unknown) => {
  const id = asString(teamId);
  if (!id) return undefined;

  return (
    board?.columns
      ?.flatMap((column) => column.tasks ?? [])
      .find((task) => task.teamId === id)?.team?.name ?? id
  );
};

const normalizeDateInput = (value: unknown) =>
  value
    ? Number.isNaN(new Date(String(value)).getTime())
      ? String(value)
      : new Date(String(value)).toISOString().slice(0, 10)
    : '';

const normalizeValue = (field: string, value: unknown) => {
  if (field === 'dueDate') return normalizeDateInput(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null || value === undefined) return '';

  return String(value);
};

const formatDate = (value: unknown, t: Translate) => {
  if (!value) return t('value.empty');

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString();
};

const formatDateTime = (value: unknown, t: Translate) => {
  if (!value) return t('value.empty');

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const formatList = (values: unknown, t: Translate) => {
  if (!Array.isArray(values) || !values.length) return t('value.empty');

  return values.map(String).join(', ');
};

const formatNumber = (value: unknown, t: Translate) => {
  if (value === null || value === undefined || value === '') {
    return t('value.empty');
  }

  return String(value);
};

const formatEstimate = (value: unknown, t: Translate) => {
  if (value === null || value === undefined || value === '') {
    return t('value.empty');
  }

  return t('value.minutes', { count: Number(value) });
};

const formatTaskFieldValue = (
  field: string,
  value: unknown,
  board: Board | undefined,
  task: Task | undefined,
  t: Translate,
) => {
  if (field === 'priority') {
    return typeof value === 'string' && PRIORITY_LABEL_KEYS[value]
      ? t(PRIORITY_LABEL_KEYS[value])
      : formatNumber(value, t);
  }
  if (field === 'labels') return formatList(value, t);
  if (field === 'dueDate') return formatDate(value, t);
  if (field === 'completedAt') return formatDateTime(value, t);
  if (field === 'isCompleted') {
    return value ? t('value.completed') : t('value.open');
  }
  if (field === 'assigneeId') {
    return asString(value)
      ? (findMemberName(board, value) ?? t('value.unassigned'))
      : t('value.unassigned');
  }
  if (field === 'assigneeName') {
    return asString(value) ?? task?.assigneeName ?? t('value.unassigned');
  }
  if (field === 'teamId') {
    return asString(value)
      ? (findTeamName(board, value) ?? t('value.noTeam'))
      : t('value.noTeam');
  }
  if (field === 'estimateMinutes') return formatEstimate(value, t);
  if (field === 'storyPoints') return formatNumber(value, t);
  if (value === null || value === undefined || value === '') {
    return t('value.empty');
  }

  return Array.isArray(value) ? formatList(value, t) : String(value);
};

const getTaskFieldValue = (task: Task | undefined, field: string) => {
  if (!task) return undefined;
  return (task as unknown as Record<string, unknown>)[field];
};

const formatTaskName = (
  board: Board | undefined,
  taskId: unknown,
  task: Task | undefined,
  t: Translate,
) => task?.title ?? findTaskTitle(board, taskId) ?? t('value.taskFallback');

const describeUpdate = (
  mutation: PendingBoardMutation,
  board: Board | undefined,
  t: Translate,
): PendingMutationDescription => {
  const payload = asPayload(mutation.payload);
  const task = findTask(board, payload.taskId);
  const changes = asChanges(payload.changes);
  const hasAssigneeIdChange = Object.prototype.hasOwnProperty.call(
    changes,
    'assigneeId',
  );
  const lines = Object.entries(changes)
    .filter(([field]) => !IGNORED_UPDATE_FIELDS.has(field))
    .filter(([field]) => !(field === 'assigneeName' && hasAssigneeIdChange))
    .flatMap(([field, nextValue]) => {
      const currentValue = getTaskFieldValue(task, field);

      if (normalizeValue(field, currentValue) === normalizeValue(field, nextValue)) {
        return [];
      }

      const label = t(FIELD_LABEL_KEYS[field] ?? 'field.unknown');
      const from = formatTaskFieldValue(field, currentValue, board, task, t);
      const to = formatTaskFieldValue(field, nextValue, board, task, t);

      return [t('detail.fieldChange', { field: label, from, to })];
    });

  return {
    title: t('detail.updateTask', {
      task: formatTaskName(board, payload.taskId, task, t),
    }),
    lines: lines.length ? lines : [t('detail.noFieldChanges')],
  };
};

const describeMove = (
  mutation: PendingBoardMutation,
  board: Board | undefined,
  t: Translate,
): PendingMutationDescription => {
  const payload = asPayload(mutation.payload);
  const task = findTask(board, payload.taskId);
  const sourceColumn =
    findColumnTitle(board, payload.sourceColumnId) ??
    findColumnTitle(board, task?.columnId) ??
    t('value.columnFallback');
  const targetColumn =
    findColumnTitle(board, payload.columnId) ?? t('value.columnFallback');
  const lines = [
    t('detail.moveColumns', { from: sourceColumn, to: targetColumn }),
  ];

  if (typeof payload.order === 'number') {
    lines.push(t('detail.moveOrder', { order: payload.order + 1 }));
  }

  return {
    title: t('detail.moveTask', {
      task: formatTaskName(board, payload.taskId, task, t),
    }),
    lines,
  };
};

const formatTaskTitleList = (
  taskIds: unknown,
  board: Board | undefined,
  t: Translate,
) => {
  if (!Array.isArray(taskIds) || !taskIds.length) return t('value.empty');

  const titles = taskIds.slice(0, 5).map((taskId) =>
    findTaskTitle(board, taskId) ?? t('value.taskFallback'),
  );
  const suffix =
    taskIds.length > titles.length
      ? t('detail.moreTasks', { count: taskIds.length - titles.length })
      : '';

  return [titles.join(', '), suffix].filter(Boolean).join(' ');
};

const describeReorder = (
  mutation: PendingBoardMutation,
  board: Board | undefined,
  t: Translate,
): PendingMutationDescription => {
  const payload = asPayload(mutation.payload);
  const columnTitle =
    findColumnTitle(board, payload.columnId) ?? t('value.columnFallback');
  const currentTaskIds =
    board?.columns
      ?.find((column) => column.id === payload.columnId)
      ?.tasks?.map((task) => task.id) ?? [];

  return {
    title: t('detail.reorderColumn', { column: columnTitle }),
    lines: [
      t('detail.reorderTasks', {
        from: formatTaskTitleList(currentTaskIds, board, t),
        to: formatTaskTitleList(payload.taskIds, board, t),
      }),
    ],
  };
};

const DESCRIBERS: Record<
  BoardSocketEvent,
  (
    mutation: PendingBoardMutation,
    board: Board | undefined,
    t: Translate,
  ) => PendingMutationDescription
> = {
  'task:update': describeUpdate,
  'task:move': describeMove,
  'task:reorder': describeReorder,
};

export const describePendingBoardMutation = (
  mutation: PendingBoardMutation,
  board: Board | undefined,
  t: Translate,
): PendingMutationDescription =>
  DESCRIBERS[mutation.event]?.(mutation, board, t) ?? {
    title: t('item.unknown'),
    lines: [t('detail.noFieldChanges')],
  };
