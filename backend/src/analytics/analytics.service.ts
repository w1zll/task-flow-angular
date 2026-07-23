import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { Board } from '@/boards/entities/board.entity';
import { Task } from '@/tasks/entities/task.entity';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import {
  AnalyticsBurndownDto,
  AnalyticsCountBucketDto,
  AnalyticsDashboardResponseDto,
  AnalyticsQueryDto,
  AnalyticsWeekPointDto,
} from './dto/analytics.dto';

type TaskScope = Pick<
  Task,
  | 'id'
  | 'title'
  | 'createdAt'
  | 'completedAt'
  | 'dueDate'
  | 'isCompleted'
  | 'estimateMinutes'
  | 'storyPoints'
  | 'teamId'
  | 'team'
  | 'assigneeId'
  | 'assignee'
> & {
  column?: {
    boardId?: string;
    board?: Pick<Board, 'id' | 'title'> | null;
  } | null;
};

type DateWindow = {
  from?: Date;
  toExclusive?: Date;
};

const MS_PER_DAY = 86_400_000;
const DEFAULT_BURNDOWN_DAYS = 90;

const toUtcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const addUtcDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const startOfUtcWeek = (date: Date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - (day - 1));
  return start;
};

const parseDateWindow = (
  fromDate?: string,
  toDate?: string,
): DateWindow | undefined => {
  if (!fromDate && !toDate) return undefined;

  const from = fromDate ? new Date(fromDate) : undefined;
  const to = toDate ? new Date(toDate) : undefined;

  return {
    from,
    toExclusive: to ? addUtcDays(to, 1) : undefined,
  };
};

const parseBurndownWindow = (query: AnalyticsQueryDto): Required<DateWindow> => {
  const end = query.toDate ? new Date(query.toDate) : new Date();
  const from = query.fromDate
    ? new Date(query.fromDate)
    : addUtcDays(end, -(DEFAULT_BURNDOWN_DAYS - 1));

  return {
    from,
    toExclusive: addUtcDays(end, 1),
  };
};

const isWithinWindow = (date: Date, window: DateWindow) => {
  if (window.from && date < window.from) return false;
  if (window.toExclusive && date >= window.toExclusive) return false;
  return true;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    private readonly workspacesService: WorkspacesService,
    private readonly boardPermissions: BoardPermissionsService,
  ) {}

  async dashboard(
    workspaceId: string,
    userId: string,
    query: AnalyticsQueryDto,
  ): Promise<AnalyticsDashboardResponseDto> {
    await this.workspacesService.assertMember(workspaceId, userId);

    const boardId = query.boardId
      ? await this.resolveBoardId(workspaceId, userId, query.boardId)
      : undefined;
    const boardIds = boardId
      ? [boardId]
      : await this.getAccessibleBoardIds(workspaceId, userId);

    if (!boardIds.length) {
      return this.createEmptyDashboard(boardId ?? null, query);
    }

    const tasks = await this.loadTasks(workspaceId, userId, boardIds, query);
    return this.buildDashboard(tasks, boardId ?? null, query);
  }

  private async resolveBoardId(
    workspaceId: string,
    userId: string,
    boardId: string,
  ): Promise<string> {
    await this.boardPermissions.assertCanRead(boardId, userId);
    const board = await this.boardRepo.findOne({
      where: { id: boardId, workspaceId },
      select: { id: true, workspaceId: true },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.id;
  }

  private async getAccessibleBoardIds(
    workspaceId: string,
    userId: string,
  ): Promise<string[]> {
    const raw = await this.boardRepo
      .createQueryBuilder('board')
      .leftJoin('board.members', 'member', 'member.userId = :userId', {
        userId,
      })
      .where('board.workspaceId = :workspaceId', { workspaceId })
      .andWhere('(board.ownerId = :userId OR member.userId = :userId)', {
        userId,
      })
      .select('board.id', 'id')
      .distinct(true)
      .getRawMany<{ id: string }>();

    return raw.map((item) => item.id);
  }

  private async loadTasks(
    workspaceId: string,
    userId: string,
    boardIds: string[],
    query: AnalyticsQueryDto,
  ): Promise<TaskScope[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.column', 'column')
      .innerJoinAndSelect('column.board', 'board')
      .leftJoin('board.members', 'member', 'member.userId = :userId', {
        userId,
      })
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('board.workspaceId = :workspaceId', { workspaceId })
      .andWhere('(board.ownerId = :userId OR member.userId = :userId)', {
        userId,
      })
      .andWhere('board.id IN (:...boardIds)', { boardIds })
      .distinct(true)
      .orderBy('task.createdAt', 'ASC');

    if (query.teamId) {
      qb.andWhere('task.teamId = :teamId', { teamId: query.teamId });
    }
    if (query.assigneeId) {
      qb.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    return qb.getMany() as Promise<TaskScope[]>;
  }

  private buildDashboard(
    tasks: TaskScope[],
    boardId: string | null,
    query: AnalyticsQueryDto,
  ): AnalyticsDashboardResponseDto {
    const completedWindow = parseDateWindow(query.fromDate, query.toDate);
    const overdueWindow = completedWindow;
    const now = new Date();

    const completedTasks = tasks.filter(
      (task) =>
        task.isCompleted &&
        Boolean(task.completedAt) &&
        (!completedWindow || isWithinWindow(task.completedAt!, completedWindow)),
    );
    const openTasks = tasks.filter((task) => !task.isCompleted);
    const overdueTasks = openTasks.filter((task) => {
      if (!task.dueDate) return false;
      if (task.dueDate >= now) return false;
      return !overdueWindow || isWithinWindow(task.dueDate, overdueWindow);
    });

    const cycleDurations = completedTasks
      .map(
        (task) =>
          (task.completedAt!.getTime() - task.createdAt.getTime()) /
          MS_PER_DAY,
      )
      .filter((duration) => duration >= 0);
    const averageDays =
      cycleDurations.length > 0
        ? Math.round(
            (cycleDurations.reduce((sum, value) => sum + value, 0) /
              cycleDurations.length) * 100,
          ) / 100
        : null;

    const completionOnTime = completedTasks.reduce(
      (acc, task) => {
        if (!task.dueDate || task.completedAt! <= task.dueDate) {
          acc.onTime += 1;
        } else {
          acc.late += 1;
        }
        return acc;
      },
      { onTime: 0, late: 0 },
    );
    const completionOnTimeTotal = completedTasks.length;

    const completedByTeam = this.buildCountBuckets(completedTasks, (task) => ({
      id: task.team?.id ?? task.teamId ?? null,
      name: task.team?.name ?? null,
    })).sort(this.sortBuckets);
    const workloadByAssignee = this.buildWorkloadBuckets(openTasks, now).sort(
      this.sortWorkloadBuckets,
    );

    const throughputByWeek = this.buildWeekSeries(completedTasks);
    const burndown = boardId
      ? this.buildBurndown(tasks, boardId, query)
      : null;

    return {
      totals: {
        completed: completedTasks.length,
        open: openTasks.length,
        overdue: overdueTasks.length,
        total: tasks.length,
      },
      completedByTeam,
      overdue: {
        count: overdueTasks.length,
        topTasks: this.buildTopOverdueTasks(overdueTasks),
      },
      workloadByAssignee,
      cycleTime: {
        averageDays,
        sampleCount: cycleDurations.length,
      },
      throughputByWeek,
      burndown,
      completionOnTime: {
        total: completionOnTimeTotal,
        onTime: completionOnTime.onTime,
        late: completionOnTime.late,
        onTimeRatio:
          completionOnTimeTotal > 0
            ? Math.round(
                ((completionOnTime.onTime / completionOnTimeTotal) * 100) /
                  1,
              ) / 100
            : null,
      },
    };
  }

  private createEmptyDashboard(
    boardId: string | null,
    query: AnalyticsQueryDto,
  ): AnalyticsDashboardResponseDto {
    return {
      totals: {
        completed: 0,
        open: 0,
        overdue: 0,
        total: 0,
      },
      completedByTeam: [],
      overdue: { count: 0, topTasks: [] },
      workloadByAssignee: [],
      cycleTime: {
        averageDays: null,
        sampleCount: 0,
      },
      throughputByWeek: [],
      burndown: boardId ? this.emptyBurndown(boardId, query) : null,
      completionOnTime: {
        total: 0,
        onTime: 0,
        late: 0,
        onTimeRatio: null,
      },
    };
  }

  private emptyBurndown(
    boardId: string,
    query: AnalyticsQueryDto,
  ): AnalyticsBurndownDto {
    const window = parseBurndownWindow(query);
    const points = this.generateBurndownPoints([], window);
    return {
      boardId,
      hasStoryPoints: false,
      remainingTasks: points.map((point) => ({
        weekStart: point.weekStart,
        count: point.remainingTasks,
      })),
      remainingStoryPoints: points.map((point) => ({
        weekStart: point.weekStart,
        count: 0,
      })),
      message: null,
    };
  }

  private buildBurndown(
    tasks: TaskScope[],
    boardId: string,
    query: AnalyticsQueryDto,
  ): AnalyticsBurndownDto {
    const window = parseBurndownWindow(query);
    const boardTasks = tasks.filter((task) => task.createdAt <= window.toExclusive);
    const points = this.generateBurndownPoints(boardTasks, window);
    const hasStoryPoints = boardTasks.some(
      (task) => task.storyPoints !== null && task.storyPoints !== undefined,
    );

    return {
      boardId,
      hasStoryPoints,
      remainingTasks: points.map((point) => ({
        weekStart: point.weekStart,
        count: point.remainingTasks,
      })),
      remainingStoryPoints: points.map((point) => ({
        weekStart: point.weekStart,
        count: point.remainingStoryPoints,
      })),
      message: null,
    };
  }

  private generateBurndownPoints(
    tasks: TaskScope[],
    window: Required<DateWindow>,
  ): Array<{
    weekStart: string;
    remainingTasks: number;
    remainingStoryPoints: number;
  }> {
    const start = startOfUtcWeek(window.from);
    const end = window.toExclusive;
    const points: Array<{
      weekStart: string;
      remainingTasks: number;
      remainingStoryPoints: number;
    }> = [];

    for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 7)) {
      const snapshotEnd = addUtcDays(cursor, 7);
      const remaining = tasks.filter((task) => {
        const createdBeforeSnapshot = task.createdAt < snapshotEnd;
        const completedBeforeSnapshot =
          task.completedAt !== null &&
          task.completedAt !== undefined &&
          task.completedAt < snapshotEnd;
        return createdBeforeSnapshot && !completedBeforeSnapshot;
      });

      points.push({
        weekStart: toUtcDateKey(cursor),
        remainingTasks: remaining.length,
        remainingStoryPoints: remaining.reduce(
          (sum, task) => sum + (task.storyPoints ?? 0),
          0,
        ),
      });
    }

    return points;
  }

  private buildWeekSeries(tasks: TaskScope[]): AnalyticsWeekPointDto[] {
    const buckets = new Map<string, number>();

    for (const task of tasks) {
      if (!task.completedAt) continue;
      const key = toUtcDateKey(startOfUtcWeek(task.completedAt));
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, count]) => ({ weekStart, count }));
  }

  private buildCountBuckets(
    tasks: TaskScope[],
    resolve: (task: TaskScope) => { id: string | null; name: string | null },
  ): AnalyticsCountBucketDto[] {
    const buckets = new Map<string, AnalyticsCountBucketDto>();

    for (const task of tasks) {
      const bucket = resolve(task);
      const key = bucket.id ?? '__unassigned__';
      const current = buckets.get(key) ?? {
        id: bucket.id,
        name: bucket.name,
        count: 0,
      };

      current.count += 1;
      if (!current.name && bucket.name) {
        current.name = bucket.name;
      }
      buckets.set(key, current);
    }

    return Array.from(buckets.values());
  }

  private buildWorkloadBuckets(tasks: TaskScope[], now: Date) {
    const buckets = new Map<
      string,
      {
        id: string | null;
        name: string | null;
        openCount: number;
        overdueCount: number;
        estimateMinutes: number;
        storyPoints: number;
      }
    >();

    for (const task of tasks) {
      const id = task.assignee?.id ?? task.assigneeId ?? null;
      const key = id ?? '__unassigned__';
      const current = buckets.get(key) ?? {
        id,
        name: task.assignee?.name ?? null,
        openCount: 0,
        overdueCount: 0,
        estimateMinutes: 0,
        storyPoints: 0,
      };

      current.openCount += 1;
      if (task.dueDate && task.dueDate < now) current.overdueCount += 1;
      current.estimateMinutes += task.estimateMinutes ?? 0;
      current.storyPoints += task.storyPoints ?? 0;
      if (!current.name && task.assignee?.name) {
        current.name = task.assignee.name;
      }
      buckets.set(key, current);
    }

    return Array.from(buckets.values());
  }

  private buildTopOverdueTasks(tasks: TaskScope[]) {
    return tasks
      .filter((task) => task.dueDate)
      .sort(
        (a, b) =>
          a.dueDate!.getTime() - b.dueDate!.getTime() ||
          a.title.localeCompare(b.title),
      )
      .slice(0, 8)
      .map((task) => ({
        id: task.id,
        title: task.title,
        boardId: task.column?.board?.id ?? task.column?.boardId ?? '',
        boardTitle: task.column?.board?.title ?? null,
        dueDate: task.dueDate!.toISOString(),
        assigneeId: task.assignee?.id ?? task.assigneeId ?? null,
        assigneeName: task.assignee?.name ?? null,
        teamId: task.team?.id ?? task.teamId ?? null,
        teamName: task.team?.name ?? null,
      }));
  }

  private sortBuckets = (
    a: AnalyticsCountBucketDto,
    b: AnalyticsCountBucketDto,
  ) => {
    if (b.count !== a.count) return b.count - a.count;
    return (a.name ?? 'Unassigned').localeCompare(b.name ?? 'Unassigned');
  };

  private sortWorkloadBuckets = (
    a: { openCount: number; overdueCount: number; name: string | null },
    b: { openCount: number; overdueCount: number; name: string | null },
  ) => {
    if (b.overdueCount !== a.overdueCount) {
      return b.overdueCount - a.overdueCount;
    }
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return (a.name ?? 'Unassigned').localeCompare(b.name ?? 'Unassigned');
  };
}
