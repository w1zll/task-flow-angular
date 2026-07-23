'use client';

import type { Board, Task } from '@/shared/api/api';
import {
  emitBoardSocketMutation,
  isBoardPermissionError,
  isBoardSocketMutationQueuedError,
} from '@/shared/lib/boardSocketMutations';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { getSocket } from '@/shared/lib/socket';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import {
  moveTaskToColumnEndInBoard,
  queryKeys,
  updateTaskInBoard,
  useDeleteTask,
} from '@/shared/queries/boards.queries';
import { useWorkspaceTeams } from '@/shared/queries/teams.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import {
  Box,
  Dialog,
  DialogContent,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useRef, useState } from 'react';
import TaskAssignmentFields from './task-detail/TaskAssignmentFields';
import TaskAttachmentsSection from './task-detail/TaskAttachmentsSection';
import TaskChecklistSection from './task-detail/TaskChecklistSection';
import TaskCustomFieldsSection, {
  MAX_ESTIMATE_HOURS,
  MAX_ESTIMATE_MINUTES,
  MAX_STORY_POINTS,
} from './task-detail/TaskCustomFieldsSection';
import TaskDetailActions from './task-detail/TaskDetailActions';
import TaskDetailHeader from './task-detail/TaskDetailHeader';
import TaskLabelsEditor from './task-detail/TaskLabelsEditor';
import TaskLinksSection from './task-detail/TaskLinksSection';
import TaskPriorityDateFields from './task-detail/TaskPriorityDateFields';
import TaskTimestamps from './task-detail/TaskTimestamps';
import TaskTitleDescriptionFields from './task-detail/TaskTitleDescriptionFields';
import TaskCommentsSection from './task-comments/TaskCommentsSection';
import type { TaskDraft } from './task-detail/types';

interface Props {
  board: Board;
  onClose?: () => void;
}

const normalizeDateInput = (value?: string | Date | null) =>
  value ? dayjs(value).format('YYYY-MM-DD') : '';

const normalizeText = (value?: string | null) => value ?? '';

const normalizeNullableId = (value?: string | null) => value ?? null;

const normalizeLabels = (value?: string[] | null) => value ?? [];

const normalizeNullableNumber = (value?: number | null) => value ?? null;

const isValidIntegerRange = (value: unknown, max: number) =>
  value === null ||
  value === undefined ||
  (typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= max);

const areLabelsEqual = (left?: string[] | null, right?: string[] | null) =>
  JSON.stringify(normalizeLabels(left)) === JSON.stringify(normalizeLabels(right));

const createTaskDraft = (task: Task): TaskDraft => ({
  title: task.title,
  description: task.description ?? '',
  priority: task.priority,
  labels: task.labels ?? [],
  dueDate: normalizeDateInput(task.dueDate),
  assigneeName: task.assigneeName ?? '',
  assigneeId: task.assigneeId ?? undefined,
  teamId: task.teamId ?? null,
  isCompleted: task.isCompleted,
  completedAt: task.completedAt,
  estimateMinutes: task.estimateMinutes ?? null,
  storyPoints: task.storyPoints ?? null,
});

const isTaskDraftChanged = (task: Task | null, form: TaskDraft) => {
  if (!task) return false;

  return (
    normalizeText(form.title) !== normalizeText(task.title) ||
    normalizeText(form.description) !== normalizeText(task.description) ||
    (form.priority ?? 'medium') !== (task.priority ?? 'medium') ||
    !areLabelsEqual(form.labels, task.labels) ||
    normalizeDateInput(form.dueDate) !== normalizeDateInput(task.dueDate) ||
    normalizeNullableId(form.assigneeId) !==
      normalizeNullableId(task.assigneeId) ||
    normalizeText(form.assigneeName) !== normalizeText(task.assigneeName) ||
    normalizeNullableId(form.teamId) !== normalizeNullableId(task.teamId) ||
    Boolean(form.isCompleted) !== Boolean(task.isCompleted) ||
    normalizeNullableNumber(form.estimateMinutes) !==
      normalizeNullableNumber(task.estimateMinutes) ||
    normalizeNullableNumber(form.storyPoints) !==
      normalizeNullableNumber(task.storyPoints)
  );
};

const TaskDetailModal = ({ board, onClose }: Props) => {
  const t = useTranslations('TaskDetail');
  const tNotifications = useTranslations('Notifications');
  const boardUI = useBoardUIStore();
  const deleteTask = useDeleteTask();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const dayjsLocale = useDayjsLocale();
  const isOnline = useOnlineStatus();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    defaultMatches: false,
  });
  useStableBodyScrollLock(!!boardUI.openTaskId);

  const task =
    board.columns
      ?.flatMap((column) => column.tasks ?? [])
      .find((item) => item.id === boardUI.openTaskId) ?? null;

  const [form, setForm] = useState<TaskDraft>({});
  const [labelInput, setLabelInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const syncedTaskIdRef = useRef<string | null>(null);
  const canEdit = board.capabilities?.canEditBoardContent ?? false;
  const canUseOnlineTaskDetails = canEdit && isOnline;
  const teams = useWorkspaceTeams(board.workspaceId, !!boardUI.openTaskId);
  const isDirty = useMemo(() => isTaskDraftChanged(task, form), [form, task]);
  const handleClose = onClose ?? boardUI.closeTask;

  useEffect(() => {
    if (!task) {
      syncedTaskIdRef.current = null;
      setForm({});
      setLabelInput('');
      setHasLocalEdits(false);
      return;
    }

    const isDifferentTask = syncedTaskIdRef.current !== task.id;
    if (isDifferentTask || !hasLocalEdits) {
      setForm(createTaskDraft(task));
      setHasLocalEdits(false);
    }
    syncedTaskIdRef.current = task.id;
  }, [hasLocalEdits, task]);

  useEffect(() => {
    if (!isOnline) return;

    const handleTaskUpdate = ({
      boardId,
      task: updatedTask,
    }: {
      boardId: string;
      task: Task;
    }) => {
      if (boardId === board.id && updatedTask.id === task?.id) {
        setIsUpdating(false);
      }
    };

    const socket = getSocket();

    socket.on('task:update', handleTaskUpdate);

    return () => {
      socket.off('task:update', handleTaskUpdate);
    };
  }, [board.id, isOnline, task?.id]);

  const patch = <K extends keyof Task,>(key: K, value: Task[K]) => {
    if (!canEdit) return;
    setHasLocalEdits(true);
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    if (!task || !canEdit) return;

    if (!isValidIntegerRange(form.estimateMinutes, MAX_ESTIMATE_MINUTES)) {
      enqueueSnackbar(t('estimateLimitHint', { max: MAX_ESTIMATE_HOURS }), {
        variant: 'error',
      });
      return;
    }
    if (!isValidIntegerRange(form.storyPoints, MAX_STORY_POINTS)) {
      enqueueSnackbar(t('storyPointsLimitHint', { max: MAX_STORY_POINTS }), {
        variant: 'error',
      });
      return;
    }

    const isCompletionChange =
      form.isCompleted !== undefined && form.isCompleted !== task.isCompleted;
    const previousBoard = qc.getQueryData<Board>(queryKeys.board(board.id));
    const optimisticTask: Task = {
      ...task,
      ...form,
      completedAt:
        form.isCompleted === true
          ? task.completedAt ?? new Date().toISOString()
          : form.isCompleted === false
            ? undefined
            : task.completedAt,
    };

    setIsUpdating(true);
    qc.setQueryData(queryKeys.board(board.id), (prev: Board | undefined) =>
      isCompletionChange && form.isCompleted
        ? moveTaskToColumnEndInBoard(prev, optimisticTask)
        : updateTaskInBoard(prev, optimisticTask),
    );

    try {
      await emitBoardSocketMutation(
        'task:update',
        {
          boardId: board.id,
          taskId: task.id,
          changes: form,
        },
        { boardId: board.id },
      );

      if (isCompletionChange) {
        qc.invalidateQueries({
          queryKey: queryKeys.boardAnalytics(board.id),
        });
      }
      setHasLocalEdits(false);
      handleClose();
    } catch (error) {
      qc.setQueryData(queryKeys.board(board.id), previousBoard);
      if (isBoardPermissionError(error)) {
        void qc.invalidateQueries({
          queryKey: queryKeys.board(board.id),
          exact: true,
        });
      }
      const isQueuedUpdate = isBoardSocketMutationQueuedError(error);
      const validationMessage =
        error instanceof Error && /Estimate must/i.test(error.message)
          ? t('estimateLimitHint', { max: MAX_ESTIMATE_HOURS })
          : error instanceof Error && /Story points must/i.test(error.message)
            ? t('storyPointsLimitHint', { max: MAX_STORY_POINTS })
            : null;
      enqueueSnackbar(
        validationMessage ??
          tNotifications(
            isBoardPermissionError(error)
              ? 'permissionDenied'
              : isQueuedUpdate
                ? 'taskQueued'
                : 'taskUpdateError',
          ),
        {
          variant:
            !isBoardPermissionError(error) && isQueuedUpdate ? 'info' : 'error',
        },
      );
      if (isQueuedUpdate) {
        boardUI.closeTask();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!task || !canUseOnlineTaskDetails) return;
    deleteTask.mutate(
      { id: task.id, boardId: board.id },
      {
        onSuccess: handleClose,
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
                : 'taskDeleteError',
            ),
            { variant: 'error' },
          );
        },
      },
    );
  };

  const addLabel = (label: string) => {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return;
    const current = form.labels ?? [];
    if (!current.includes(trimmed)) {
      patch('labels', [...current, trimmed]);
    }
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    patch(
      'labels',
      (form.labels ?? []).filter((item) => item !== label),
    );
  };

  if (!task) return null;

  const columnTitle =
    board.columns?.find((column) => column.id === task.columnId)?.title ?? '';

  return (
    <Dialog
      open={!!boardUI.openTaskId}
      onClose={handleClose}
      onKeyDown={(event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key === 'Enter' &&
          canEdit &&
          isDirty &&
          !isUpdating
        ) {
          event.preventDefault();
          void handleSave();
        }
      }}
      aria-label={t('dialogTitle')}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : '6px',
          },
        },
      }}
    >
      <TaskDetailHeader
        columnTitle={columnTitle}
        onClose={handleClose}
      />

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          px: { xs: 2, sm: 3 },
          pt: '8px !important',
        }}
      >
        <TaskTitleDescriptionFields
          form={form}
          canEdit={canEdit}
          onPatch={patch}
        />

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            '& > *': {
              flex: { xs: '1 1 100%', sm: '1 1 220px' },
            },
          }}
        >
          <TaskPriorityDateFields
            form={form}
            canEdit={canEdit}
            onPatch={patch}
          />
          <TaskAssignmentFields
            form={form}
            board={board}
            teams={teams.data}
            isTeamsLoading={teams.isLoading}
            canEdit={canEdit}
            onPatch={patch}
          />
        </Box>

        <TaskCustomFieldsSection
          form={form}
          canEdit={canEdit}
          onPatch={patch}
        />

        <TaskLabelsEditor
          labels={form.labels ?? []}
          labelInput={labelInput}
          canEdit={canEdit}
          onLabelInputChange={setLabelInput}
          onAddLabel={addLabel}
          onRemoveLabel={removeLabel}
        />

        <TaskLinksSection task={task} form={form} />

        <TaskChecklistSection
          task={task}
          board={board}
          canEdit={canUseOnlineTaskDetails}
        />

        <TaskAttachmentsSection
          task={task}
          boardId={board.id}
          canEdit={canUseOnlineTaskDetails}
        />

        <TaskCommentsSection
          taskId={task.id}
          board={board}
          canEdit={canUseOnlineTaskDetails}
        />

        <TaskTimestamps task={task} dayjsLocale={dayjsLocale} />
      </DialogContent>

      <Divider />

      <TaskDetailActions
        canEdit={canEdit}
        canDelete={canUseOnlineTaskDetails}
        isDirty={isDirty}
        isUpdating={isUpdating}
        onClose={handleClose}
        onDelete={handleDelete}
        onSave={handleSave}
      />
    </Dialog>
  );
};

export default TaskDetailModal;
