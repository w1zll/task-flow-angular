'use client';

import type { Task } from '@/shared/api/api';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

interface TaskTimestampsProps {
  task: Task;
  dayjsLocale: string;
}

const TaskTimestamps = ({ task, dayjsLocale }: TaskTimestampsProps) => {
  const t = useTranslations('TaskDetail');

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {t('created')} {dayjs(task.createdAt).locale(dayjsLocale).format('D MMM')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('updated')} {dayjs(task.updatedAt).locale(dayjsLocale).format('D MMM')}
      </Typography>
    </Box>
  );
};

export default TaskTimestamps;
