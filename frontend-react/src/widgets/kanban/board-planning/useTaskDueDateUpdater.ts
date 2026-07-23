'use client';

import type { Board, Task } from '@/shared/api/api';
import {
  emitBoardSocketMutation,
  isBoardPermissionError,
  isBoardSocketMutationQueuedError,
} from '@/shared/lib/boardSocketMutations';
import { queryKeys, updateTaskInBoard } from '@/shared/queries/boards.queries';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useCallback, useState } from 'react';

interface UpdateDueDateOptions {
  taskId: string;
  dueDate: string | null;
}

export const useTaskDueDateUpdater = (boardId: string) => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const t = useTranslations('Notifications');
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const updateTaskDueDate = useCallback(
    async ({ taskId, dueDate }: UpdateDueDateOptions) => {
      const previousBoard = qc.getQueryData<Board>(queryKeys.board(boardId));
      const task = previousBoard?.columns
        ?.flatMap((column) => column.tasks ?? [])
        .find((item) => item.id === taskId);

      if (!task) return;

      setPendingTaskId(taskId);
      qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
        updateTaskInBoard(prev, {
          ...task,
          dueDate,
        } as Task),
      );

      try {
        await emitBoardSocketMutation(
          'task:update',
          {
            boardId,
            taskId,
            changes: { dueDate },
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
          t(
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
        setPendingTaskId(null);
      }
    },
    [boardId, enqueueSnackbar, qc, t],
  );

  return {
    pendingTaskId,
    updateTaskDueDate,
  };
};
