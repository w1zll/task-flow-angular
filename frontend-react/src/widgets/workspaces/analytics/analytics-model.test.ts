import type { WorkspaceAnalyticsDashboard } from '@/shared/api/api';
import { buildWorkspaceAnalyticsChartModel } from './analytics-model';

const dashboard: WorkspaceAnalyticsDashboard = {
  totals: { completed: 4, open: 3, overdue: 1, total: 7 },
  completedByTeam: [
    { id: 'team-1', name: 'Design', count: 3 },
    { id: null, name: null, count: 1 },
  ],
  overdue: { count: 1, topTasks: [] },
  workloadByAssignee: [
    {
      id: 'user-1',
      name: 'Alex',
      openCount: 3,
      overdueCount: 1,
      estimateMinutes: 120,
      storyPoints: 5,
    },
  ],
  cycleTime: { averageDays: 2, sampleCount: 4 },
  throughputByWeek: [{ weekStart: '2026-07-06', count: 4 }],
  burndown: {
    boardId: 'board-1',
    hasStoryPoints: true,
    remainingTasks: [{ weekStart: '2026-07-06', count: 3 }],
    remainingStoryPoints: [{ weekStart: '2026-07-06', count: 8 }],
  },
  completionOnTime: { total: 4, onTime: 3, late: 1, onTimeRatio: 0.75 },
};

const labels = {
  unassignedTeam: 'No team',
  unassignedAssignee: 'No assignee',
  completed: 'Completed',
  open: 'Open',
  overdue: 'Overdue',
  remainingStoryPoints: 'Remaining points',
  remainingTasks: 'Remaining tasks',
};

describe('workspace analytics chart model', () => {
  it('transforms dashboard DTOs into chart-ready series', () => {
    const model = buildWorkspaceAnalyticsChartModel(
      dashboard,
      labels,
      (value) => `date:${value}`,
    );

    expect(model.completedByTeam).toEqual({
      xAxisData: ['Design', 'No team'],
      series: [{ data: [3, 1], label: 'Completed' }],
    });
    expect(model.workload.series.map((series) => series.data)).toEqual([
      [3],
      [1],
    ]);
    expect(model.throughput.xAxisData).toEqual(['date:2026-07-06']);
    expect(model.burndown.series).toEqual([
      { data: [8], label: 'Remaining points' },
    ]);
    expect(model.burndownBoardId).toBe('board-1');
  });

  it('returns stable empty models without data', () => {
    expect(
      buildWorkspaceAnalyticsChartModel(undefined, labels, String),
    ).toEqual({
      completedByTeam: { xAxisData: [], series: [] },
      workload: { xAxisData: [], series: [] },
      throughput: { xAxisData: [], series: [] },
      burndown: { xAxisData: [], series: [] },
      burndownBoardId: null,
      burndownUsesStoryPoints: false,
    });
  });
});
