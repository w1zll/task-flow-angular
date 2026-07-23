'use client';

import type { WorkspaceAnalyticsDashboard } from '@/shared/api/api';
import { AccessTimeOutlined, AssignmentLateOutlined, DoneAllOutlined, TrendingUpOutlined } from '@mui/icons-material';
import { Grid } from '@mui/material';
import { useTranslations } from 'next-intl';
import { AnalyticsStatCard } from './AnalyticsPanels';

interface Props {
  data?: WorkspaceAnalyticsDashboard;
  isLoading: boolean;
}

const AnalyticsKpiSummary = ({ data, isLoading }: Props) => {
  const t = useTranslations('WorkspaceAnalytics');
  const ratio = data?.completionOnTime.onTimeRatio;
  const formattedRatio = ratio === null || ratio === undefined
    ? t('notAvailable')
    : `${Math.round(ratio * 100)}%`;

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <AnalyticsStatCard icon={<DoneAllOutlined fontSize="small" />} label={t('stats.completed')} value={data?.totals.completed ?? 0} helper={t('stats.completedHelp')} tone="success" isLoading={isLoading} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <AnalyticsStatCard icon={<AssignmentLateOutlined fontSize="small" />} label={t('stats.overdue')} value={data?.totals.overdue ?? 0} helper={t('stats.overdueHelp')} tone="warning" isLoading={isLoading} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <AnalyticsStatCard
          icon={<AccessTimeOutlined fontSize="small" />}
          label={t('stats.cycleTime')}
          value={data?.cycleTime.averageDays == null ? t('notAvailable') : t('days', { count: data.cycleTime.averageDays })}
          helper={t('stats.cycleTimeHelp', { count: data?.cycleTime.sampleCount ?? 0 })}
          isLoading={isLoading}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <AnalyticsStatCard icon={<TrendingUpOutlined fontSize="small" />} label={t('stats.onTime')} value={formattedRatio} helper={t('stats.onTimeHelp', { late: data?.completionOnTime.late ?? 0 })} isLoading={isLoading} />
      </Grid>
    </Grid>
  );
};

export default AnalyticsKpiSummary;
