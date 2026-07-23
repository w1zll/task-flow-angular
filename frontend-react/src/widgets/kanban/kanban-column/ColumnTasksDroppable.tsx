'use client';

import type { BoardColumn } from '@/shared/api/api';
import { Droppable } from '@hello-pangea/dnd';
import { Box } from '@mui/material';
import TaskCard from '../TaskCard';
import { getDropAreaSx } from './kanbanColumnStyles';

interface ColumnTasksDroppableProps {
  column: BoardColumn;
  boardId: string;
  pendingTaskId?: string | null;
  isTaskDragDisabled: boolean;
  canEdit: boolean;
  highlightedTaskId?: string | null;
}

const ColumnTasksDroppable = ({
  column,
  boardId,
  pendingTaskId,
  isTaskDragDisabled,
  canEdit,
  highlightedTaskId,
}: ColumnTasksDroppableProps) => (
  <Droppable droppableId={column.id} type="TASK">
    {(provided, snapshot) => (
      <Box
        ref={provided.innerRef}
        {...provided.droppableProps}
        sx={getDropAreaSx(snapshot.isDraggingOver)}
      >
        {(column.tasks ?? []).map((task, taskIndex) => (
          <TaskCard
            key={task.id}
            task={task}
            index={taskIndex}
            boardId={boardId}
            isPending={task.id === pendingTaskId}
            isDragDisabled={isTaskDragDisabled}
            canEdit={canEdit}
            isHighlighted={task.id === highlightedTaskId}
          />
        ))}
        {provided.placeholder}
      </Box>
    )}
  </Droppable>
);

export default ColumnTasksDroppable;
