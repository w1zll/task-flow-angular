'use client';

import type { Board, BoardColumn } from '@/shared/api/api';
import { isBoardPermissionError } from '@/shared/lib/boardSocketMutations';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  useCreateTask,
  useDeleteColumn,
  useUpdateColumn,
} from '@/shared/queries/boards.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import { Draggable } from '@hello-pangea/dnd';
import { Paper } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import AddTaskComposer from './kanban-column/AddTaskComposer';
import ColumnActionsMenu from './kanban-column/ColumnActionsMenu';
import ColumnTasksDroppable from './kanban-column/ColumnTasksDroppable';
import { getColumnPaperSx } from './kanban-column/kanbanColumnStyles';
import KanbanColumnHeader from './kanban-column/KanbanColumnHeader';

interface Props {
  column: BoardColumn;
  board: Board;
  index: number;
  pendingTaskId?: string | null;
  isColumnDragDisabled?: boolean;
  isTaskDragDisabled?: boolean;
  highlightedTaskId?: string | null;
}

type MutationErrorKey =
  | 'taskCreateError'
  | 'columnUpdateError'
  | 'columnDeleteError';

const KanbanColumn = ({
  column,
  board,
  index,
  pendingTaskId,
  isColumnDragDisabled = false,
  isTaskDragDisabled = false,
  highlightedTaskId,
}: Props) => {
  const tNotifications = useTranslations('Notifications');
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const addingTaskInColumnId = useBoardUIStore(
    (state) => state.addingTaskInColumnId,
  );
  const setAddingTaskInColumn = useBoardUIStore(
    (state) => state.setAddingTaskInColumn,
  );
  const createTask = useCreateTask();
  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();
  const isOffline = useIsOffline();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(column.title);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const canEditBoardContent =
    board.capabilities?.canEditBoardContent ?? false;
  const canCreateTasks = canEditBoardContent && !isOffline;
  const canManageColumns = board.capabilities?.canManageColumns ?? false;
  const isAddingTask = addingTaskInColumnId === column.id;

  useEffect(() => {
    setTitleInput(column.title);
  }, [column.title]);

  const handleMutationError = (
    error: unknown,
    fallbackKey: MutationErrorKey,
  ) => {
    if (isBoardPermissionError(error)) {
      void qc.invalidateQueries({
        queryKey: queryKeys.board(board.id),
        exact: true,
      });
    }
    enqueueSnackbar(
      tNotifications(
        isBoardPermissionError(error) ? 'permissionDenied' : fallbackKey,
      ),
      { variant: 'error' },
    );
  };

  const handleAddTask = () => {
    if (!canCreateTasks) return;
    const title = newTaskTitle.trim();
    if (!title) return;

    createTask.mutate(
      { title, columnId: column.id, boardId: board.id },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setAddingTaskInColumn(null);
        },
        onError: (error) => handleMutationError(error, 'taskCreateError'),
      },
    );
  };

  const cancelTitleEdit = () => {
    setTitleInput(column.title);
    setIsEditingTitle(false);
  };

  const handleRenameColumn = () => {
    if (!canManageColumns) return;
    const title = titleInput.trim();
    if (title && title !== column.title) {
      updateColumn.mutate(
        {
          id: column.id,
          data: { title },
          boardId: board.id,
        },
        {
          onError: (error) => handleMutationError(error, 'columnUpdateError'),
        },
      );
    }
    setIsEditingTitle(false);
  };

  const handleDeleteColumn = () => {
    if (!canManageColumns) return;
    setMenuAnchor(null);
    deleteColumn.mutate(
      { id: column.id, boardId: board.id },
      {
        onError: (error) => handleMutationError(error, 'columnDeleteError'),
      },
    );
  };

  return (
    <Draggable
      draggableId={column.id}
      index={index}
      isDragDisabled={isColumnDragDisabled}
    >
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          elevation={0}
          sx={getColumnPaperSx(snapshot.isDragging)}
        >
          <KanbanColumnHeader
            title={column.title}
            taskCount={column.tasks?.length ?? 0}
            titleInput={titleInput}
            isEditingTitle={isEditingTitle}
            isColumnDragDisabled={isColumnDragDisabled}
            canEditBoardContent={canEditBoardContent}
            canManageColumns={canManageColumns}
            dragHandleProps={provided.dragHandleProps}
            onTitleInputChange={setTitleInput}
            onSubmitTitle={handleRenameColumn}
            onCancelTitleEdit={cancelTitleEdit}
            onStartAddingTask={() => setAddingTaskInColumn(column.id)}
            onOpenMenu={setMenuAnchor}
          />

          <ColumnTasksDroppable
            column={column}
            boardId={board.id}
            pendingTaskId={pendingTaskId}
            isTaskDragDisabled={isTaskDragDisabled}
            canEdit={canEditBoardContent}
            highlightedTaskId={highlightedTaskId}
          />

          <AddTaskComposer
            isAddingTask={isAddingTask}
            canEditBoardContent={canCreateTasks}
            newTaskTitle={newTaskTitle}
            isCreating={createTask.isPending}
            onTitleChange={setNewTaskTitle}
            onSubmit={handleAddTask}
            onCancel={() => setAddingTaskInColumn(null)}
            onStartAdding={() => setAddingTaskInColumn(column.id)}
          />

          {canManageColumns && (
            <ColumnActionsMenu
              anchorEl={menuAnchor}
              onClose={() => setMenuAnchor(null)}
              onRename={() => {
                setMenuAnchor(null);
                setIsEditingTitle(true);
              }}
              onDelete={handleDeleteColumn}
            />
          )}
        </Paper>
      )}
    </Draggable>
  );
};

export default KanbanColumn;
