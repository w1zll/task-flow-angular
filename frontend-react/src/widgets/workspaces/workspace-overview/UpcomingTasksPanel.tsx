'use client';

import type { WorkspaceTask } from '@/shared/queries/workspace-tasks.queries';
import { OpenInNew } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';

interface UpcomingTasksPanelProps {
  workspaceId: string;
  tasks: WorkspaceTask[];
  isLoading: boolean;
}

const UpcomingTasksPanel = ({
  workspaceId,
  tasks,
  isLoading,
}: UpcomingTasksPanelProps) => {
  const t = useTranslations('WorkspaceOverview');
  const format = useFormatter();

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0, height: '100%' }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ minWidth: 0, justifyContent: 'space-between', mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('myUpcomingTasks')}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {t('myUpcomingTasksDescription')}
          </Typography>
        </Box>
        <Button
          component={Link}
          href={`/workspaces/${workspaceId}/my-tasks`}
          size="small"
          endIcon={<OpenInNew />}
        >
          {t('allTasks')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={58} />
          ))}
        </Stack>
      ) : tasks.length ? (
        <Stack spacing={1}>
          {tasks.map((task) => (
            <Card key={task.id} variant="outlined">
              <CardActionArea
                component={Link}
                href={`/workspaces/${workspaceId}/boards/${task.boardId}?taskId=${encodeURIComponent(task.id)}`}
                sx={{ p: 1.5 }}
              >
                <Typography
                  sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                >
                  {task.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {task.boardTitle} · {task.columnTitle}
                  {task.dueDate
                    ? ` · ${format.dateTime(new Date(task.dueDate), {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })}`
                    : ''}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary">{t('emptyTasks')}</Typography>
      )}
    </Paper>
  );
};

export default UpcomingTasksPanel;
