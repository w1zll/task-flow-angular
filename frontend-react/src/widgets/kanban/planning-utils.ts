import type { Board, Task, Team } from '@/shared/api/api';
import dayjs, { type Dayjs } from 'dayjs';

export const PLANNING_DATE_FORMAT = 'YYYY-MM-DD';
export const NO_TEAM_ROW_ID = '__no-team__';
export const NO_DUE_DATE_DROP_ID = '__no-due-date__';

export interface PlannedTask extends Task {
  columnTitle: string;
  columnOrder: number;
  taskOrder: number;
}

export interface AgendaDateGroup {
  dateKey: string;
  tasks: PlannedTask[];
}

export interface TeamRoadmapRow {
  id: string;
  title: string;
  color?: string | null;
}

const comparePlannedTasks = (left: PlannedTask, right: PlannedTask) => {
  if (left.columnOrder !== right.columnOrder) {
    return left.columnOrder - right.columnOrder;
  }

  if (left.taskOrder !== right.taskOrder) {
    return left.taskOrder - right.taskOrder;
  }

  return left.title.localeCompare(right.title);
};

export const toDateKey = (value?: string | null) => {
  if (!value) return null;

  const date = dayjs(value);
  return date.isValid() ? date.format(PLANNING_DATE_FORMAT) : null;
};

export const toMonthKey = (value: string | Dayjs) =>
  dayjs(value).format('YYYY-MM');

export const toWeekKey = (value: string | Dayjs, locale?: string) =>
  dayjs(value).locale(locale ?? 'en').startOf('week').format(PLANNING_DATE_FORMAT);

export const getBoardPlanningTasks = (board?: Board): PlannedTask[] =>
  (board?.columns ?? [])
    .flatMap((column, columnIndex) =>
      (column.tasks ?? []).map((task) => ({
        ...task,
        columnTitle: column.title,
        columnOrder: column.order ?? columnIndex,
        taskOrder: task.order,
      })),
    )
    .sort(comparePlannedTasks);

export const groupTasksByDueDate = (tasks: PlannedTask[]) => {
  const byDate: Record<string, PlannedTask[]> = {};
  const noDueDate: PlannedTask[] = [];

  tasks.forEach((task) => {
    const dateKey = toDateKey(task.dueDate);
    if (!dateKey) {
      noDueDate.push(task);
      return;
    }

    byDate[dateKey] = [...(byDate[dateKey] ?? []), task];
  });

  Object.keys(byDate).forEach((dateKey) => {
    byDate[dateKey] = byDate[dateKey].sort(comparePlannedTasks);
  });

  return {
    byDate,
    noDueDate: noDueDate.sort(comparePlannedTasks),
  };
};

export const createCalendarWeekDays = (
  anchor: string | Dayjs,
  locale?: string,
) => {
  const start = dayjs(anchor).locale(locale ?? 'en').startOf('week');

  return Array.from({ length: 7 }, (_, index) => start.add(index, 'day'));
};

export const createCalendarMonthDays = (
  anchor: string | Dayjs,
  locale?: string,
) => {
  const month = dayjs(anchor).locale(locale ?? 'en');
  const start = month.startOf('month').startOf('week');
  const end = month.endOf('month').endOf('week');
  const days: Dayjs[] = [];

  for (
    let cursor = start;
    cursor.isBefore(end, 'day') || cursor.isSame(end, 'day');
    cursor = cursor.add(1, 'day')
  ) {
    days.push(cursor);
  }

  return days;
};

export const createRollingWeeks = (
  anchor: string | Dayjs = dayjs(),
  count = 6,
  locale?: string,
) => {
  const start = dayjs(anchor).locale(locale ?? 'en').startOf('week');

  return Array.from({ length: count }, (_, index) => start.add(index, 'week'));
};

export const createRollingMonths = (
  anchor: string | Dayjs = dayjs(),
  count = 6,
) => {
  const start = dayjs(anchor).startOf('month');

  return Array.from({ length: count }, (_, index) => start.add(index, 'month'));
};

export const createAgendaGroups = (
  tasks: PlannedTask[],
  today: string | Dayjs = dayjs(),
) => {
  const currentDay = dayjs(today).startOf('day');
  const overdue: PlannedTask[] = [];
  const todayTasks: PlannedTask[] = [];
  const upcomingByDate: Record<string, PlannedTask[]> = {};
  const noDueDate: PlannedTask[] = [];

  tasks.forEach((task) => {
    const dateKey = toDateKey(task.dueDate);
    if (!dateKey) {
      noDueDate.push(task);
      return;
    }

    const dueDate = dayjs(dateKey);
    if (dueDate.isBefore(currentDay, 'day')) {
      overdue.push(task);
      return;
    }

    if (dueDate.isSame(currentDay, 'day')) {
      todayTasks.push(task);
      return;
    }

    upcomingByDate[dateKey] = [...(upcomingByDate[dateKey] ?? []), task];
  });

  const upcoming = Object.entries(upcomingByDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, dateTasks]) => ({
      dateKey,
      tasks: dateTasks.sort(comparePlannedTasks),
    }));

  return {
    overdue: overdue.sort(comparePlannedTasks),
    today: todayTasks.sort(comparePlannedTasks),
    upcoming,
    noDueDate: noDueDate.sort(comparePlannedTasks),
  };
};

export const groupTasksByWeek = (
  tasks: PlannedTask[],
  weekKeys: string[],
  locale?: string,
) => {
  const validWeekKeys = new Set(weekKeys);
  const byColumnAndWeek: Record<string, Record<string, PlannedTask[]>> = {};

  tasks.forEach((task) => {
    const dateKey = toDateKey(task.dueDate);
    if (!dateKey) return;

    const weekKey = toWeekKey(dateKey, locale);
    if (!validWeekKeys.has(weekKey)) return;

    byColumnAndWeek[task.columnId] = {
      ...(byColumnAndWeek[task.columnId] ?? {}),
      [weekKey]: [
        ...(byColumnAndWeek[task.columnId]?.[weekKey] ?? []),
        task,
      ],
    };
  });

  Object.values(byColumnAndWeek).forEach((weekMap) => {
    Object.keys(weekMap).forEach((weekKey) => {
      weekMap[weekKey] = weekMap[weekKey].sort((left, right) => {
        const leftDate = toDateKey(left.dueDate) ?? '';
        const rightDate = toDateKey(right.dueDate) ?? '';

        return leftDate.localeCompare(rightDate) || comparePlannedTasks(left, right);
      });
    });
  });

  return byColumnAndWeek;
};

export const getRoadmapTeamRows = (
  tasks: PlannedTask[],
  teams: Team[] = [],
): TeamRoadmapRow[] => {
  const rows = new Map<string, TeamRoadmapRow>();

  teams.forEach((team) => {
    rows.set(team.id, {
      id: team.id,
      title: team.name,
      color: team.color,
    });
  });

  tasks.forEach((task) => {
    if (!task.team?.id && !task.teamId) return;

    const teamId = task.team?.id ?? task.teamId;
    if (!teamId || rows.has(teamId)) return;

    rows.set(teamId, {
      id: teamId,
      title: task.team?.name ?? task.teamId ?? '',
      color: task.team?.color,
    });
  });

  return [
    ...Array.from(rows.values()).sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
    { id: NO_TEAM_ROW_ID, title: 'No team' },
  ];
};

export const groupTasksByTeamAndMonth = (
  tasks: PlannedTask[],
  monthKeys: string[],
) => {
  const validMonthKeys = new Set(monthKeys);
  const byTeamAndMonth: Record<string, Record<string, PlannedTask[]>> = {};

  tasks.forEach((task) => {
    const dateKey = toDateKey(task.dueDate);
    if (!dateKey) return;

    const monthKey = toMonthKey(dateKey);
    if (!validMonthKeys.has(monthKey)) return;

    const teamKey = task.team?.id ?? task.teamId ?? NO_TEAM_ROW_ID;
    byTeamAndMonth[teamKey] = {
      ...(byTeamAndMonth[teamKey] ?? {}),
      [monthKey]: [
        ...(byTeamAndMonth[teamKey]?.[monthKey] ?? []),
        task,
      ],
    };
  });

  Object.values(byTeamAndMonth).forEach((monthMap) => {
    Object.keys(monthMap).forEach((monthKey) => {
      monthMap[monthKey] = monthMap[monthKey].sort((left, right) => {
        const leftDate = toDateKey(left.dueDate) ?? '';
        const rightDate = toDateKey(right.dueDate) ?? '';

        return leftDate.localeCompare(rightDate) || comparePlannedTasks(left, right);
      });
    });
  });

  return byTeamAndMonth;
};

export const countTasksWithoutDueDate = (tasks: PlannedTask[]) =>
  tasks.filter((task) => !toDateKey(task.dueDate)).length;
