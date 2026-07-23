'use client';

import type { Task } from '@/shared/api/api';
import {
  AttachFileOutlined,
  CalendarTodayOutlined,
  CheckCircleOutlined,
  ChecklistRounded,
  FlagOutlined,
} from '@mui/icons-material';
import { Box, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import type { TaskPriorityConfig } from './taskCardPriority';

interface TaskMetaRowProps {
  task: Task;
  priority: TaskPriorityConfig;
  priorityLabel: string;
  isOverdue: boolean;
  dayjsLocale: string;
}

const TaskMetaRow = ({
  task,
  priority,
  priorityLabel,
  isOverdue,
  dayjsLocale,
}: TaskMetaRowProps) => {
  const t = useTranslations('TaskCard');
  const checklistTotal = task.checklistItems?.length ?? 0;
  const checklistDone =
    task.checklistItems?.filter((item) => item.isDone).length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        columnGap: 1,
        rowGap: 0.5,
        flexWrap: 'wrap',
        mt: 0.5,
      }}
    >
      {task.isCompleted && (
        <Tooltip title={t('completedTooltip')}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: 'success.main',
              flexShrink: 0,
            }}
          >
            <CheckCircleOutlined sx={{ fontSize: 13 }} />
            <Typography
              variant="caption"
              sx={{ fontSize: 11, fontWeight: 600 }}
            >
              {t('completed')}
            </Typography>
          </Box>
        </Tooltip>
      )}

      <Tooltip title={t('priorityTooltip', { priority: priorityLabel })}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            flexShrink: 0,
          }}
        >
          <FlagOutlined sx={{ fontSize: 13, color: priority.color }} />
          <Typography
            variant="caption"
            sx={{
              color: priority.color,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {priorityLabel}
          </Typography>
        </Box>
      </Tooltip>

      {task.dueDate && (
        <Tooltip
          title={t('deadlineTooltip', {
            date: dayjs(task.dueDate).locale(dayjsLocale).format('D MMM'),
          })}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: isOverdue ? 'error.main' : 'text.secondary',
              flexShrink: 0,
            }}
          >
            <CalendarTodayOutlined sx={{ fontSize: 12 }} />
            <Typography
              variant="caption"
            sx={{
              fontSize: 11,
              fontWeight: isOverdue ? 600 : 400,
            }}
          >
              {isOverdue ? `${t('overdue')} · ` : ''}
              {dayjs(task.dueDate).locale(dayjsLocale).format('D MMM')}
            </Typography>
          </Box>
        </Tooltip>
      )}

      {checklistTotal > 0 && (
        <Tooltip
          title={t('checklistTooltip', {
            done: checklistDone,
            total: checklistTotal,
          })}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color:
                checklistDone === checklistTotal
                  ? 'success.main'
                  : 'text.secondary',
              flexShrink: 0,
            }}
          >
            <ChecklistRounded sx={{ fontSize: 13 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              {checklistDone}/{checklistTotal}
            </Typography>
          </Box>
        </Tooltip>
      )}

      {attachmentCount > 0 && (
        <Tooltip title={t('attachmentsTooltip', { count: attachmentCount })}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              color: 'text.secondary',
              flexShrink: 0,
            }}
          >
            <AttachFileOutlined sx={{ fontSize: 13 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              {attachmentCount}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
};

export default TaskMetaRow;
