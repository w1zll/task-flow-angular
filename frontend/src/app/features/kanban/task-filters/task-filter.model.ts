import { ParamMap, Params } from '@angular/router';

import { TaskResponseDto } from '@core/api/generated';

export type TaskFilterPriority = TaskResponseDto['priority'];
export type TaskFilterStatus = 'all' | 'open' | 'completed';
export type TaskFilterDue = 'all' | 'overdue' | 'none' | 'today' | 'week';

export interface TaskFilterState {
  readonly search: string;
  readonly assigneeId: string | null;
  readonly mine: boolean;
  readonly unassigned: boolean;
  readonly priorities: readonly TaskFilterPriority[];
  readonly labels: readonly string[];
  readonly status: TaskFilterStatus;
  readonly due: TaskFilterDue;
}

export interface TaskFilterAssignee {
  readonly id: string;
  readonly name: string;
}

export const defaultTaskFilters: TaskFilterState = {
  search: '',
  assigneeId: null,
  mine: false,
  unassigned: false,
  priorities: [],
  labels: [],
  status: 'all',
  due: 'all',
};

const priorities = new Set<TaskFilterPriority>(['low', 'medium', 'high', 'urgent']);
const statuses = new Set<TaskFilterStatus>(['all', 'open', 'completed']);
const dueFilters = new Set<TaskFilterDue>(['all', 'overdue', 'none', 'today', 'week']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const cleanText = (value: string | null, maxLength: number): string =>
  (value ?? '').trim().slice(0, maxLength);

const listValues = (params: ParamMap, key: string): string[] =>
  params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => cleanText(value, 100))
    .filter(Boolean);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

export const parseTaskFilters = (params: ParamMap): TaskFilterState => {
  const status = params.get('status') as TaskFilterStatus | null;
  const due = params.get('due') as TaskFilterDue | null;
  const assigneeId = cleanText(params.get('assignee'), 100);

  return {
    search: cleanText(params.get('q'), 200),
    assigneeId: uuidPattern.test(assigneeId) ? assigneeId : null,
    mine: params.get('mine') === '1',
    unassigned: params.get('unassigned') === '1',
    priorities: unique(
      listValues(params, 'priority').filter((value): value is TaskFilterPriority =>
        priorities.has(value as TaskFilterPriority),
      ),
    ),
    labels: unique(listValues(params, 'label')).slice(0, 20),
    status: status && statuses.has(status) ? status : 'all',
    due: due && dueFilters.has(due) ? due : 'all',
  };
};

export const serializeTaskFilters = (filters: TaskFilterState): Params => {
  const params: Params = {};
  if (filters.search) params['q'] = filters.search;
  if (filters.assigneeId) params['assignee'] = filters.assigneeId;
  if (filters.mine) params['mine'] = '1';
  if (filters.unassigned) params['unassigned'] = '1';
  if (filters.priorities.length) params['priority'] = [...filters.priorities];
  if (filters.labels.length) params['label'] = [...filters.labels];
  if (filters.status !== 'all') params['status'] = filters.status;
  if (filters.due !== 'all') params['due'] = filters.due;
  return params;
};

export const taskFilterSignature = (filters: TaskFilterState): string =>
  JSON.stringify(serializeTaskFilters(filters));

export const hasTaskFilters = (filters: TaskFilterState): boolean =>
  Object.keys(serializeTaskFilters(filters)).length > 0;

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const taskDueDate = (value: string): Date | null => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const matchesDue = (task: TaskResponseDto, due: TaskFilterDue, now: Date): boolean => {
  if (due === 'all') return true;
  if (!task.dueDate) return due === 'none';
  if (due === 'none') return false;

  const taskDate = taskDueDate(task.dueDate);
  if (!taskDate) return false;

  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (due === 'overdue') return !task.isCompleted && taskDate < today;
  if (due === 'today') return taskDate >= today && taskDate < tomorrow;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return taskDate >= weekStart && taskDate < weekEnd;
};

export const taskMatchesFilters = (
  task: TaskResponseDto,
  filters: TaskFilterState,
  currentUserId: string | null,
  now = new Date(),
): boolean => {
  const search = filters.search.toLocaleLowerCase();
  if (search && !`${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(search)) {
    return false;
  }

  const assigneeId = task.assigneeId ?? task.assignee?.id ?? null;
  const hasAssigneeFilter = filters.assigneeId !== null || filters.mine || filters.unassigned;
  if (
    hasAssigneeFilter &&
    !(
      (filters.assigneeId !== null && assigneeId === filters.assigneeId) ||
      (filters.mine && currentUserId !== null && assigneeId === currentUserId) ||
      (filters.unassigned && assigneeId === null)
    )
  ) {
    return false;
  }

  if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
  if (
    filters.labels.length &&
    !filters.labels.every((label) => (task.labels ?? []).includes(label))
  ) {
    return false;
  }
  if (filters.status === 'open' && task.isCompleted) return false;
  if (filters.status === 'completed' && !task.isCompleted) return false;

  return matchesDue(task, filters.due, now);
};
