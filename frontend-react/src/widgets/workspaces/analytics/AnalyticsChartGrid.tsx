'use client';

import type { WorkspaceAnalyticsDashboard } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { Grid } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { buildWorkspaceAnalyticsChartModel } from './analytics-model';
import { AnalyticsChartPanel } from './AnalyticsPanels';

interface BoardOption {
  id: string;
  title: string;
}

interface Props {
  data?: WorkspaceAnalyticsDashboard;
  boards: BoardOption[];
  isLoading: boolean;
}

const AnalyticsChartGrid = ({ data, boards, isLoading }: Props) => {
  const t = useTranslations('WorkspaceAnalytics');
  const locale = useDayjsLocale();
  const formatDate = useCallback(
    (value: string) => dayjs(value).locale(locale).format('D MMM'),
    [locale],
  );
  const model = useMemo(
    () =>
      buildWorkspaceAnalyticsChartModel(
        data,
        {
          unassignedTeam: t('unassignedTeam'),
          unassignedAssignee: t('unassignedAssignee'),
          completed: t('charts.completedSeries'),
          open: t('charts.openSeries'),
          overdue: t('charts.overdueSeries'),
          remainingStoryPoints: t('charts.remainingStoryPoints'),
          remainingTasks: t('charts.remainingTasks'),
        },
        formatDate,
      ),
    [data, formatDate, t],
  );
  const selectedBoard = boards.find(
    (board) => board.id === model.burndownBoardId,
  );

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <AnalyticsChartPanel title={t('charts.completedByTeam')} description={t('charts.completedByTeamHelp')} isLoading={isLoading} isEmpty={!model.completedByTeam.xAxisData.length} emptyText={t('charts.emptyCompleted')}>
          <BarChart height={260} xAxis={[{ scaleType: 'band', data: model.completedByTeam.xAxisData, tickLabelStyle: { fontSize: 11 } }]} yAxis={[{ tickMinStep: 1 }]} series={model.completedByTeam.series} grid={{ horizontal: true }} margin={{ top: 24, right: 16, bottom: 56, left: 40 }} hideLegend />
        </AnalyticsChartPanel>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <AnalyticsChartPanel title={t('charts.workload')} description={t('charts.workloadHelp')} isLoading={isLoading} isEmpty={!model.workload.xAxisData.length} emptyText={t('charts.emptyWorkload')}>
          <BarChart height={260} xAxis={[{ scaleType: 'band', data: model.workload.xAxisData, tickLabelStyle: { fontSize: 11 } }]} yAxis={[{ tickMinStep: 1 }]} series={model.workload.series} grid={{ horizontal: true }} margin={{ top: 24, right: 16, bottom: 56, left: 40 }} />
        </AnalyticsChartPanel>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <AnalyticsChartPanel title={t('charts.throughput')} description={t('charts.throughputHelp')} isLoading={isLoading} isEmpty={!model.throughput.xAxisData.length} emptyText={t('charts.emptyThroughput')}>
          <BarChart height={260} xAxis={[{ scaleType: 'band', data: model.throughput.xAxisData, tickLabelStyle: { fontSize: 11 } }]} yAxis={[{ tickMinStep: 1 }]} series={model.throughput.series} grid={{ horizontal: true }} margin={{ top: 24, right: 16, bottom: 56, left: 40 }} hideLegend />
        </AnalyticsChartPanel>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <AnalyticsChartPanel
          title={t('charts.burndown')}
          description={model.burndownBoardId ? t('charts.burndownHelp', { board: selectedBoard?.title ?? t('unknownBoard') }) : t('charts.burndownNeedsBoard')}
          isLoading={isLoading}
          isEmpty={!model.burndownBoardId || !model.burndown.xAxisData.length}
          emptyText={model.burndownBoardId ? t('charts.emptyBurndown') : t('charts.pickBoard')}
        >
          <LineChart height={260} xAxis={[{ scaleType: 'point', data: model.burndown.xAxisData, tickLabelStyle: { fontSize: 11 } }]} yAxis={[{ tickMinStep: 1 }]} series={model.burndown.series} grid={{ horizontal: true }} margin={{ top: 24, right: 16, bottom: 56, left: 40 }} />
        </AnalyticsChartPanel>
      </Grid>
    </Grid>
  );
};

export default AnalyticsChartGrid;
