'use client';

import type { Task } from '@/shared/api/api';
import { Box, Typography } from '@mui/material';
import { useRef } from 'react';
import TaskLabels from './TaskLabels';
import TaskMetaRow from './TaskMetaRow';
import type { TaskPriorityConfig } from './taskCardPriority';
import TaskTeamChip from './TaskTeamChip';

interface TaskCardContentProps {
  task: Task;
  priority: TaskPriorityConfig;
  priorityLabel: string;
  isOverdue: boolean;
  dayjsLocale: string;
  isCardPending: boolean;
  onOpenTask: (taskId: string) => void;
}

const TaskCardContent = ({
  task,
  priority,
  priorityLabel,
  isOverdue,
  dayjsLocale,
  isCardPending,
  onOpenTask,
}: TaskCardContentProps) => {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <Box
      onPointerDown={(event) => {
        pointerStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }}
      onPointerUp={(event) => {
        const pointerStart = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!pointerStart || isCardPending) return;

        const deltaX = event.clientX - pointerStart.x;
        const deltaY = event.clientY - pointerStart.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance > 6) return;

        onOpenTask(task.id);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      sx={{
        p: 1.5,
        pl: 2,
        pr: { xs: 6.5, md: 4.5 },
        minWidth: 0,
        pointerEvents: isCardPending ? 'none' : 'auto',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          lineHeight: 1.4,
          mb: task.labels?.length ? 1 : 0,
          fontWeight: 500,
          color: task.isCompleted ? 'text.secondary' : 'text.primary',
          textDecoration: task.isCompleted ? 'line-through' : 'none',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {task.title}
      </Typography>

      <TaskLabels labels={task.labels} />
      <TaskTeamChip team={task.team} />
      <TaskMetaRow
        task={task}
        priority={priority}
        priorityLabel={priorityLabel}
        isOverdue={isOverdue}
        dayjsLocale={dayjsLocale}
      />
    </Box>
  );
};

export default TaskCardContent;
