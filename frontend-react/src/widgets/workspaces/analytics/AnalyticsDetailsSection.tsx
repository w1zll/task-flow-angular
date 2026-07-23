'use client';

import type { WorkspaceAnalyticsDashboard } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { GroupsOutlined } from '@mui/icons-material';
import { Alert, Box, Chip, Grid, Paper, Skeleton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface Props {
  workspaceId: string;
  data?: WorkspaceAnalyticsDashboard;
  isLoading: boolean;
}

const AnalyticsDetailsSection = ({ workspaceId, data, isLoading }: Props) => {
  const t = useTranslations('WorkspaceAnalytics');
  const locale = useDayjsLocale();
  const workload = data?.workloadByAssignee ?? [];
  const formatHours = (minutes: number) =>
    minutes > 0 ? t('hours', { count: Math.round(minutes / 60) }) : '0';

  return (
    <Grid container spacing={2} sx={{ mt: 0 }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper variant="outlined" sx={{ minWidth: 0, height: '100%', p: { xs: 1.75, sm: 2 }, borderRadius: '8px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t('overdue.title')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{t('overdue.description')}</Typography>
          {isLoading ? (
            <Stack spacing={1} sx={{ mt: 2 }}>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={58} />)}</Stack>
          ) : data?.overdue.topTasks.length ? (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {data.overdue.topTasks.map((task) => (
                <Paper key={task.id} component={Link} href={`/workspaces/${workspaceId}/boards/${task.boardId}?taskId=${encodeURIComponent(task.id)}`} variant="outlined" sx={{ p: 1.25, borderRadius: '8px', color: 'inherit', textDecoration: 'none', '&:hover': { borderColor: 'primary.main' } }}>
                  <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{task.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.boardTitle ?? t('unknownBoard')} / {dayjs(task.dueDate).locale(locale).format('D MMM YYYY')}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : <Alert severity="success" sx={{ mt: 2 }}>{t('overdue.empty')}</Alert>}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper variant="outlined" sx={{ minWidth: 0, height: '100%', p: { xs: 1.75, sm: 2 }, borderRadius: '8px' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <GroupsOutlined color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t('workload.title')}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">{t('workload.description')}</Typography>
          {isLoading ? (
            <Stack spacing={1} sx={{ mt: 2 }}>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} variant="rounded" height={50} />)}</Stack>
          ) : workload.length ? (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {workload.slice(0, 6).map((item) => (
                <Stack key={item.id ?? 'unassigned'} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: '8px', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{item.name ?? t('unassignedAssignee')}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('workload.estimate', { estimate: formatHours(item.estimateMinutes), points: item.storyPoints })}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip size="small" label={t('workload.open', { count: item.openCount })} />
                    <Chip size="small" color={item.overdueCount > 0 ? 'warning' : 'default'} label={t('workload.overdue', { count: item.overdueCount })} />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ) : <Alert severity="info" sx={{ mt: 2 }}>{t('workload.empty')}</Alert>}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AnalyticsDetailsSection;
