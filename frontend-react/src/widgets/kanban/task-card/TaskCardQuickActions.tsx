'use client';

import type { Task } from '@/shared/api/api';
import UserAvatar from '@/shared/ui/UserAvatar';
import {
  CheckCircleOutlined,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { Box, Checkbox, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface TaskCardQuickActionsProps {
  task: Task;
  isDisabled: boolean;
  canEdit: boolean;
  moveAction?: ReactNode;
  onToggleCompletion: () => void;
}

const TaskCardQuickActions = ({
  task,
  isDisabled,
  canEdit,
  moveAction,
  onToggleCompletion,
}: TaskCardQuickActionsProps) => {
  const t = useTranslations('TaskCard');

  return (
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 4, md: 6 },
        right: { xs: 4, md: 6 },
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <Tooltip title={task.isCompleted ? t('markIncomplete') : t('markComplete')}>
        <span>
          <Checkbox
            size="small"
            checked={!!task.isCompleted}
            disabled={isDisabled || !canEdit}
            onChange={onToggleCompletion}
            icon={<RadioButtonUnchecked fontSize="small" />}
            checkedIcon={<CheckCircleOutlined fontSize="small" />}
            slotProps={{
              input: {
                'aria-label': t('completionToggle'),
              },
            }}
            sx={{
              p: 0,
              width: { xs: 44, md: 20 },
              height: { xs: 44, md: 20 },
              color: 'text.disabled',
              '&.Mui-checked': {
                color: 'success.main',
              },
              '& .MuiSvgIcon-root': {
                fontSize: 20,
              },
            }}
          />
        </span>
      </Tooltip>
      {moveAction}
      {task.assigneeName && (
        <Tooltip title={task.assigneeName}>
          <Box>
            <UserAvatar
              name={task.assigneeName}
              src={task.assignee?.avatar}
              size={20}
            />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
};

export default TaskCardQuickActions;
