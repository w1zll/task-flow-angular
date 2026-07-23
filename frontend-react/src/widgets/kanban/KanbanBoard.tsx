'use client';

import { useState, useEffect } from 'react';
import { Board, columnsApi, type Task } from '@/shared/api/api';
import { queryKeys } from '@/shared/queries/boards.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useTranslations } from 'next-intl';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import { Box } from '@mui/material';
import { useBoardSocket } from '@/shared/hooks/useBoardSocket';
import {
  emitBoardSocketMutation,
  isBoardPermissionError,
  isBoardSocketMutationQueuedError,
} from '@/shared/lib/boardSocketMutations';

interface Props {
  board: Board;
  highlightedTaskId?: string | null;
  isReorderDisabled?: boolean;
}

const KanbanBoard = ({
  board,
  highlightedTaskId,
  isReorderDisabled = false,
}: Props) => {
  const t = useTranslations('Notifications');
  const startDrag = useBoardUIStore((state) => state.startDrag);
  const endDrag = useBoardUIStore((state) => state.endDrag);
  const suppressNextTaskClick = useBoardUIStore(
    (state) => state.suppressNextTaskClick,
  );
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  useBoardSocket(board.id);

  const [localBoard, setLocalBoard] = useState<Board>(board);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const canEditBoardContent =
    board.capabilities?.canEditBoardContent ?? false;
  const canManageColumns = board.capabilities?.canManageColumns ?? false;
  const normalizeTaskOrder = (tasks: Task[]) =>
    (tasks ?? []).map((task, order) => ({ ...task, order }));

  useEffect(() => {
    setLocalBoard(board);
  }, [board]);

  const handleDragStart = (start: any) => {
    if (pendingTaskId) return;
    if (isReorderDisabled) return;
    if (start.type === 'COLUMN' && !canManageColumns) return;
    if (start.type === 'TASK' && !canEditBoardContent) return;
    if (start.type === 'TASK') {
      startDrag(start.draggableId);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    if (type === 'TASK') {
      suppressNextTaskClick(draggableId);
    }
    endDrag();

    if (isReorderDisabled) return;
    if (type === 'COLUMN' && !canManageColumns) return;
    if (type === 'TASK' && !canEditBoardContent) return;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    const previousBoard = localBoard;

    if (type === 'COLUMN') {
      const cols = Array.from(localBoard.columns ?? []);
      const [moved] = cols.splice(source.index, 1);
      cols.splice(destination.index, 0, moved);

      const newBoard = {
        ...localBoard,
        columns: cols,
      };

      setLocalBoard(newBoard);

      try {
        const newIds = cols.map((c) => c.id);
        await columnsApi.reorder(board.id, newIds);
        qc.setQueryData(queryKeys.board(board.id), newBoard);
        qc.invalidateQueries({
          queryKey: queryKeys.board(board.id),
          exact: true,
        });
      } catch (error) {
        setLocalBoard(previousBoard);
        if (isBoardPermissionError(error)) {
          void qc.invalidateQueries({
            queryKey: queryKeys.board(board.id),
            exact: true,
          });
        }
        enqueueSnackbar(
          t(
            isBoardPermissionError(error)
              ? 'permissionDenied'
              : 'columnMoveError',
          ),
          { variant: 'error' },
        );
      }

      return;
    }

    const srcColId = source.droppableId;
    const dstColId = destination.droppableId;
    const isSameColumn = srcColId === dstColId;

    const computeNewBoard = (prev: Board): Board => {
      const columns = prev.columns!.map((c) => ({
        ...c,
        tasks: Array.from(c.tasks ?? []),
      }));

      const srcCol = columns.find((c) => c.id === srcColId);
      const dstCol = columns.find((c) => c.id === dstColId);

      if (!srcCol || !dstCol) return prev;

      const srcTasks = Array.from(srcCol.tasks ?? []);
      const [movedTask] = srcTasks.splice(source.index, 1);

      if (isSameColumn) {
        srcTasks.splice(destination.index, 0, movedTask);

        return {
          ...prev,
          columns: columns.map((c) =>
            c.id === srcColId
              ? { ...c, tasks: normalizeTaskOrder(srcTasks) }
              : c,
          ),
        };
      } else {
        const dstTasks = Array.from(dstCol.tasks ?? []);

        dstTasks.splice(destination.index, 0, {
          ...movedTask,
          columnId: dstColId,
        });

        return {
          ...prev,
          columns: columns.map((c) => {
            if (c.id === srcColId) {
              return { ...c, tasks: normalizeTaskOrder(srcTasks) };
            }
            if (c.id === dstColId) {
              return { ...c, tasks: normalizeTaskOrder(dstTasks) };
            }
            return c;
          }),
        };
      }
    };

    const newBoard = computeNewBoard(localBoard);
    setPendingTaskId(draggableId);
    setLocalBoard(newBoard);

    try {
      if (isSameColumn) {
        const col = newBoard.columns?.find((c) => c.id === srcColId);
        await emitBoardSocketMutation(
          'task:reorder',
          {
            boardId: board.id,
            columnId: srcColId,
            taskIds: col?.tasks?.map((t) => t.id) ?? [],
          },
          { boardId: board.id },
        );
      } else {
        await emitBoardSocketMutation(
          'task:move',
          {
            boardId: board.id,
            taskId: draggableId,
            columnId: dstColId,
            order: destination.index,
            sourceColumnId: srcColId,
          },
          { boardId: board.id },
        );
      }
      qc.setQueryData(queryKeys.board(board.id), newBoard);
    } catch (error) {
      setLocalBoard(previousBoard);
      qc.setQueryData(queryKeys.board(board.id), previousBoard);
      if (isBoardPermissionError(error)) {
        void qc.invalidateQueries({
          queryKey: queryKeys.board(board.id),
          exact: true,
        });
      }
      enqueueSnackbar(
        t(
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
      setPendingTaskId(null);
    }
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Droppable
        droppableId="board-columns"
        type="COLUMN"
        direction="horizontal"
      >
        {(provided) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}
          >
            {(localBoard.columns ?? []).map((col, index) => (
              <KanbanColumn
                key={col.id}
                column={col}
                board={localBoard}
                index={index}
                pendingTaskId={pendingTaskId}
                isColumnDragDisabled={
                  isReorderDisabled || !canManageColumns || !!pendingTaskId
                }
                isTaskDragDisabled={
                  isReorderDisabled || !canEditBoardContent || !!pendingTaskId
                }
                highlightedTaskId={highlightedTaskId}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default KanbanBoard;
