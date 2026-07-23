'use client';

import type { Board } from '@/shared/api/api';
import { useBoardSocket } from '@/shared/hooks/useBoardSocket';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { isBoardPermissionError } from '@/shared/lib/boardSocketMutations';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { useCreateTask } from '@/shared/queries/boards.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import { Add, LockOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import AddTaskComposer from './kanban-column/AddTaskComposer';
import TaskCard from './TaskCard';

interface MobileKanbanBoardProps {
  board: Board;
  highlightedTaskId?: string | null;
  isReorderDisabled?: boolean;
}

const MobileKanbanBoard = ({
  board,
  highlightedTaskId,
  isReorderDisabled = false,
}: MobileKanbanBoardProps) => {
  const t = useTranslations('BoardPage');
  const tNotifications = useTranslations('Notifications');
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const createTask = useCreateTask();
  const isOffline = useIsOffline();
  const addingTaskInColumnId = useBoardUIStore(
    (state) => state.addingTaskInColumnId,
  );
  const setAddingTaskInColumn = useBoardUIStore(
    (state) => state.setAddingTaskInColumn,
  );
  const columns = useMemo(() => board.columns ?? [], [board.columns]);
  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id ?? '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const canEditBoardContent =
    board.capabilities?.canEditBoardContent ?? false;
  const canCreateTasks = canEditBoardContent && !isOffline;
  const canMoveTasks = canEditBoardContent && !isReorderDisabled;
  const activeColumn =
    columns.find((column) => column.id === activeColumnId) ?? columns[0];
  const activeColumnIndex = activeColumn
    ? columns.findIndex((column) => column.id === activeColumn.id)
    : -1;
  const isAddingTask = addingTaskInColumnId === activeColumn?.id;
  const moveColumns = useMemo(
    () => columns.map((column) => ({ id: column.id, title: column.title })),
    [columns],
  );

  useBoardSocket(board.id);

  useEffect(() => {
    if (!columns.length) {
      setActiveColumnId('');
      return;
    }

    if (!columns.some((column) => column.id === activeColumnId)) {
      setActiveColumnId(columns[0].id);
    }
  }, [activeColumnId, columns]);

  useEffect(() => {
    if (!highlightedTaskId) return;

    const highlightedColumn = columns.find((column) =>
      column.tasks?.some((task) => task.id === highlightedTaskId),
    );
    if (highlightedColumn) {
      setActiveColumnId(highlightedColumn.id);
    }
  }, [columns, highlightedTaskId]);

  const handleAddTask = () => {
    if (!activeColumn || !canCreateTasks) return;

    const title = newTaskTitle.trim();
    if (!title) return;

    createTask.mutate(
      { title, columnId: activeColumn.id, boardId: board.id },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          setAddingTaskInColumn(null);
        },
        onError: (error) => {
          if (isBoardPermissionError(error)) {
            void qc.invalidateQueries({
              queryKey: queryKeys.board(board.id),
              exact: true,
            });
          }
          enqueueSnackbar(
            tNotifications(
              isBoardPermissionError(error)
                ? 'permissionDenied'
                : 'taskCreateError',
            ),
            { variant: 'error' },
          );
        },
      },
    );
  };

  if (!columns.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">{t('mobile.noColumns')}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 2,
          pt: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 0,
            pb: 0.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
            >
              {activeColumn?.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('mobile.columnPosition', {
                current: activeColumnIndex + 1,
                total: columns.length,
              })}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={t('mobile.taskCount', {
              count: activeColumn?.tasks?.length ?? 0,
            })}
            variant="outlined"
          />
        </Stack>
        <Tabs
          value={activeColumn?.id ?? false}
          onChange={(_, value: string) => setActiveColumnId(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('mobile.columnsTabs')}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              minWidth: 88,
              px: 1.25,
              textTransform: 'none',
              alignItems: 'flex-start',
            },
          }}
        >
          {columns.map((column) => (
            <Tab
              sx={{
                p: 0,
              }}
              key={column.id}
              value={column.id}
              label={
                <Stack spacing={0.1} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {column.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {column.tasks?.length ?? 0}
                  </Typography>
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 2,
          pb: canCreateTasks ? 10 : 2,
        }}
      >
        {isReorderDisabled && canEditBoardContent && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {t('mobile.moveDisabledByFilters')}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Stack spacing={1.25} sx={{ p: 1.25 }}>
            {activeColumn?.tasks?.length ? (
              activeColumn.tasks.map((task, taskIndex) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={taskIndex}
                  boardId={board.id}
                  dragMode="static"
                  canEdit={canEditBoardContent}
                  isHighlighted={task.id === highlightedTaskId}
                  currentColumnId={activeColumn.id}
                  moveColumns={moveColumns}
                  showMoveAction={canMoveTasks}
                />
              ))
            ) : (
              <Box
                sx={{
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary',
                  px: 2,
                }}
              >
                <Typography variant="body2">
                  {t('mobile.emptyColumn')}
                </Typography>
              </Box>
            )}

            {isAddingTask && (
              <AddTaskComposer
                isAddingTask={isAddingTask}
                canEditBoardContent={canCreateTasks}
                newTaskTitle={newTaskTitle}
                isCreating={createTask.isPending}
                onTitleChange={setNewTaskTitle}
                onSubmit={handleAddTask}
                onCancel={() => setAddingTaskInColumn(null)}
                onStartAdding={() => setAddingTaskInColumn(activeColumn.id)}
              />
            )}
          </Stack>
        </Paper>
      </Box>

      {canCreateTasks && activeColumn && (
        <Paper
          elevation={8}
          sx={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            borderRadius: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 1,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddingTaskInColumn(activeColumn.id)}
            disabled={isAddingTask}
            sx={{ minHeight: 44 }}
          >
            {t('mobile.addTask')}
          </Button>
        </Paper>
      )}

      {!canEditBoardContent && (
        <Paper
          elevation={0}
          sx={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            borderRadius: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            py: 1,
          }}
        >
          <Chip
            icon={<LockOutlined />}
            label={t('readOnly')}
            variant="outlined"
            sx={{ width: '100%', minHeight: 44 }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default MobileKanbanBoard;
