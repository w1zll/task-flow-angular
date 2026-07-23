import type { WorkspaceAnalyticsDashboard } from '@/shared/api/api';

export interface AnalyticsChartSeries {
  data: number[];
  label: string;
}

export interface AnalyticsChartModel {
  xAxisData: string[];
  series: AnalyticsChartSeries[];
}

export interface WorkspaceAnalyticsChartLabels {
  unassignedTeam: string;
  unassignedAssignee: string;
  completed: string;
  open: string;
  overdue: string;
  remainingStoryPoints: string;
  remainingTasks: string;
}

export interface WorkspaceAnalyticsChartModel {
  completedByTeam: AnalyticsChartModel;
  workload: AnalyticsChartModel;
  throughput: AnalyticsChartModel;
  burndown: AnalyticsChartModel;
  burndownBoardId: string | null;
  burndownUsesStoryPoints: boolean;
}

const emptyChart = (): AnalyticsChartModel => ({
  xAxisData: [],
  series: [],
});

export const buildWorkspaceAnalyticsChartModel = (
  data: WorkspaceAnalyticsDashboard | undefined,
  labels: WorkspaceAnalyticsChartLabels,
  formatDate: (value: string) => string,
): WorkspaceAnalyticsChartModel => {
  if (!data) {
    return {
      completedByTeam: emptyChart(),
      workload: emptyChart(),
      throughput: emptyChart(),
      burndown: emptyChart(),
      burndownBoardId: null,
      burndownUsesStoryPoints: false,
    };
  }

  const burndownPoints = data.burndown
    ? data.burndown.hasStoryPoints
      ? data.burndown.remainingStoryPoints
      : data.burndown.remainingTasks
    : [];

  return {
    completedByTeam: {
      xAxisData: data.completedByTeam.map(
        (item) => item.name ?? labels.unassignedTeam,
      ),
      series: [
        {
          data: data.completedByTeam.map((item) => item.count),
          label: labels.completed,
        },
      ],
    },
    workload: {
      xAxisData: data.workloadByAssignee.map(
        (item) => item.name ?? labels.unassignedAssignee,
      ),
      series: [
        {
          data: data.workloadByAssignee.map((item) => item.openCount),
          label: labels.open,
        },
        {
          data: data.workloadByAssignee.map((item) => item.overdueCount),
          label: labels.overdue,
        },
      ],
    },
    throughput: {
      xAxisData: data.throughputByWeek.map((item) =>
        formatDate(item.weekStart),
      ),
      series: [
        {
          data: data.throughputByWeek.map((item) => item.count),
          label: labels.completed,
        },
      ],
    },
    burndown: {
      xAxisData: burndownPoints.map((item) => formatDate(item.weekStart)),
      series: [
        {
          data: burndownPoints.map((item) => item.count),
          label: data.burndown?.hasStoryPoints
            ? labels.remainingStoryPoints
            : labels.remainingTasks,
        },
      ],
    },
    burndownBoardId: data.burndown?.boardId ?? null,
    burndownUsesStoryPoints: data.burndown?.hasStoryPoints ?? false,
  };
};
