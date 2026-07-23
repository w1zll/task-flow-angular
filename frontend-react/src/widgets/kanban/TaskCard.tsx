'use client';

import type { Board, Task } from '@/shared/api/api';
import {
  emitBoardSocketMutation,
  isBoardPermissionError,
  isBoardSocketMutationQueuedError,
} from '@/shared/lib/boardSocketMutations';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import {
  moveTaskToColumnInBoard,
  moveTaskToColumnEndInBoard,
  queryKeys,
  updateTaskInBoard,
} from '@/shared/queries/boards.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import {
  Draggable,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import { Card } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import TaskCardContent from './task-card/TaskCardContent';
import TaskCardQuickActions from './task-card/TaskCardQuickActions';
import { PRIORITY_CONFIG } from './task-card/taskCardPriority';
import { getTaskCardSx } from './task-card/taskCardStyles';
import TaskMoveMenu, {
  type TaskMoveColumnOption,
} from './task-card/TaskMoveMenu';

interface Props {
  task: Task;
  index: number;
  boardId: string;
  dragMode?: 'dnd' | 'static';
  isPending?: boolean;
  isDragDisabled?: boolean;
  canEdit?: boolean;
  isHighlighted?: boolean;
  currentColumnId?: string;
  moveColumns?: TaskMoveColumnOption[];
  showMoveAction?: boolean;
}

const TaskCard = ({
  task,
  index,
  boardId,
  dragMode = 'dnd',
  isPending = false,
  isDragDisabled = false,
  canEdit = true,
  isHighlighted = false,
  currentColumnId,
  moveColumns = [],
  showMoveAction = false,
}: Props) => {
  const dayjsLocale = useDayjsLocale();
  const openTask = useBoardUIStore((state) => state.openTask);
  const t = useTranslations('TaskCard');
  const tNotifications = useTranslations('Notifications');
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const priorityLabel = t(priority.labelKey);
  const [isCompletionPending, setIsCompletionPending] = useState(false);
  const [isMovePending, setIsMovePending] = useState(false);
  const isCardPending = isPending || isCompletionPending || isMovePending;

  const isOverdue = Boolean(
    !task.isCompleted &&
      task.dueDate &&
      dayjs(task.dueDate).isBefore(dayjs(), 'day'),
  );

  const handleToggleCompletion = async () => {
    if (isCardPending || !canEdit) return;

    const nextIsCompleted = !task.isCompleted;
    const previousBoard = qc.getQueryData<Board>(queryKeys.board(boardId));
    const optimisticTask: Task = {
      ...task,
      isCompleted: nextIsCompleted,
      completedAt: nextIsCompleted
        ? task.completedAt ?? new Date().toISOString()
        : undefined,
    };

    setIsCompletionPending(true);
    qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
      nextIsCompleted
        ? moveTaskToColumnEndInBoard(prev, optimisticTask)
        : updateTaskInBoard(prev, optimisticTask),
    );

    try {
      await emitBoardSocketMutation(
        'task:update',
        {
          boardId,
          taskId: task.id,
          changes: { isCompleted: nextIsCompleted },
        },
        { boardId },
      );

      qc.invalidateQueries({ queryKey: queryKeys.boardAnalytics(boardId) });
    } catch (error) {
      qc.setQueryData(queryKeys.board(boardId), previousBoard);
      if (isBoardPermissionError(error)) {
        void qc.invalidateQueries({
          queryKey: queryKeys.board(boardId),
          exact: true,
        });
      }
      enqueueSnackbar(
        tNotifications(
          isBoardPermissionError(error)
            ? 'permissionDenied'
            : isBoardSocketMutationQueuedError(error)
              ? 'taskQueued'
              : 'taskUpdateError',
        ),
        {
          variant:
            !isBoardPermissionError(error) &&
            isBoardSocketMutationQueuedError(error)
              ? 'info'
              : 'error',
        },
      );
    } finally {
      setIsCompletionPending(false);
    }
  };

  const handleMoveTask = async (columnId: string) => {
    if (isCardPending || !canEdit || columnId === currentColumnId) return;

    const previousBoard = qc.getQueryData<Board>(queryKeys.board(boardId));
    const targetTaskCount =
      previousBoard?.columns?.find((column) => column.id === columnId)?.tasks
        ?.length ?? 0;

    setIsMovePending(true);
    qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
      moveTaskToColumnInBoard(prev, task.id, columnId),
    );

    try {
      await emitBoardSocketMutation(
        'task:move',
        {
          boardId,
          taskId: task.id,
          columnId,
          order: targetTaskCount,
          sourceColumnId: currentColumnId ?? task.columnId,
        },
        { boardId },
      );
    } catch (error) {
      qc.setQueryData(queryKeys.board(boardId), previousBoard);
      if (isBoardPermissionError(error)) {
        void qc.invalidateQueries({
          queryKey: queryKeys.board(boardId),
          exact: true,
        });
      }
      enqueueSnackbar(
        tNotifications(
          isBoardPermissionError(error)
            ? 'permissionDenied'
            : isBoardSocketMutationQueuedError(error)
              ? 'taskQueued'
              : 'taskMoveError',
        ),
        {
          variant:
            !isBoardPermissionError(error) &&
            isBoardSocketMutationQueuedError(error)
              ? 'info'
              : 'error',
        },
      );
    } finally {
      setIsMovePending(false);
    }
  };

  const renderCard = (
    provided?: DraggableProvided,
    snapshot?: DraggableStateSnapshot,
  ) => {
    const isDragging = snapshot?.isDragging ?? false;

    return (
      <Card
        ref={provided?.innerRef}
        id={`task-${task.id}`}
        {...(provided?.draggableProps ?? {})}
        {...(provided?.dragHandleProps ?? {})}
        elevation={isDragging ? 8 : 0}
        role="button"
        tabIndex={isCardPending ? -1 : 0}
        aria-label={t('openTask', { title: task.title })}
        aria-busy={isCardPending}
        aria-disabled={isCardPending || isDragDisabled || !canEdit}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            event.currentTarget === event.target &&
            !isCardPending
          ) {
            event.preventDefault();
            openTask(task.id);
          }
        }}
        onClickCapture={(event) => {
          const { consumeSuppressedTaskClick } = useBoardUIStore.getState();
          const shouldSuppressClick = consumeSuppressedTaskClick(task.id);
          if (isCardPending || shouldSuppressClick) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        sx={getTaskCardSx({
          isDragging,
          isHighlighted,
          isCardPending,
          isCompleted: task.isCompleted,
          canEdit,
          priorityColor: priority.color,
        })}
      >
        <TaskCardQuickActions
          task={task}
          isDisabled={isCardPending}
          canEdit={canEdit}
          moveAction={
            showMoveAction ? (
              <TaskMoveMenu
                columns={moveColumns}
                currentColumnId={currentColumnId}
                isDisabled={isCardPending || !canEdit}
                onMove={handleMoveTask}
              />
            ) : undefined
          }
          onToggleCompletion={handleToggleCompletion}
        />
        <TaskCardContent
          task={task}
          priority={priority}
          priorityLabel={priorityLabel}
          isOverdue={isOverdue}
          dayjsLocale={dayjsLocale}
          isCardPending={isCardPending}
          onOpenTask={openTask}
        />
      </Card>
    );
  };

  if (dragMode === 'static') {
    return renderCard();
  }

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isCardPending || isDragDisabled || !canEdit}
    >
      {(provided, snapshot) => renderCard(provided, snapshot)}
    </Draggable>
  );
};

export default TaskCard;
