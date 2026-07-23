'use client';

import {
  AssignmentTurnedInOutlined,
  GroupsOutlined,
  ViewKanbanOutlined,
} from '@mui/icons-material';
import { Box, Grid, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface WorkspaceStatsGridProps {
  boardsCount: number;
  myTeamsCount: number;
  openMyTasksCount: number;
  isLoading: boolean;
}

const WorkspaceStatsGrid = ({
  boardsCount,
  myTeamsCount,
  openMyTasksCount,
  isLoading,
}: WorkspaceStatsGridProps) => {
  const t = useTranslations('WorkspaceOverview');
  const stats = [
    {
      icon: <ViewKanbanOutlined />,
      label: t('boards'),
      value: boardsCount,
    },
    {
      icon: <GroupsOutlined />,
      label: t('myTeams'),
      value: myTeamsCount,
    },
    {
      icon: <AssignmentTurnedInOutlined />,
      label: t('openMyTasks'),
      value: openMyTasksCount,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((item) => (
        <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0, height: '100%' }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ minWidth: 0, alignItems: 'center' }}
            >
              <Box sx={{ color: 'primary.main', flexShrink: 0 }}>
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {isLoading ? <Skeleton width={42} /> : item.value}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default WorkspaceStatsGrid;
