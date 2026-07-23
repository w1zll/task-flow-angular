import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import {
  disconnectSocket,
  ensureSocketConnected,
  getSocket,
} from '../lib/socket';
import { Board, BoardActivity, Task, TaskComment } from '../api/api';
import {
  addTaskToBoard,
  invalidateWorkspaceAnalyticsForBoard,
  findTaskInBoard,
  moveTaskToColumnEndInBoard,
  queryKeys,
  removeTaskFromBoard,
  updateTaskInBoard,
} from '../queries/boards.queries';

const TASK_DETAIL_ACTIVITY_FIELDS = new Set([
  'checklist',
  'checklistOrder',
  'attachment',
]);

const hasTaskDetailActivityChange = (
  metadata?: Record<string, unknown> | null,
) => {
  const changes = metadata?.changes;
  if (!Array.isArray(changes)) return false;

  return changes.some((change) => {
    const field = (change as { field?: unknown }).field;
    return typeof field === 'string' && TASK_DETAIL_ACTIVITY_FIELDS.has(field);
  });
};

const normalizeTasksByOrder = (tasks: Task[]) =>
  [...tasks]
    .sort((a, b) => a.order - b.order)
    .map((task, order) => ({ ...task, order }));

const applyTaskOrder = (tasks: Task[], taskIds?: string[]) => {
  if (!taskIds) return normalizeTasksByOrder(tasks);

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const orderedTasks = taskIds.flatMap((taskId, order) => {
    const task = taskById.get(taskId);
    return task ? [{ ...task, order }] : [];
  });
  const orderedTaskIds = new Set(taskIds);
  const remainingTasks = normalizeTasksByOrder(
    tasks.filter((task) => !orderedTaskIds.has(task.id)),
  ).map((task, index) => ({
    ...task,
    order: orderedTasks.length + index,
  }));

  return [...orderedTasks, ...remainingTasks];
};

export const useBoardSocket = (boardId: string) => {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    let isActive = true;
    let isRefreshingAuth = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWithToken = async () => {
      if (isRefreshingAuth || !isActive) return;
      isRefreshingAuth = true;

      try {
        await ensureSocketConnected(socket);
      } catch (error) {
        console.error('socket auth error:', error);
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          scheduleReconnect();
        }
      } finally {
        isRefreshingAuth = false;
      }
    };

    const scheduleReconnect = () => {
      if (!isActive) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        void connectWithToken();
      }, 2000);
    };

    const onConnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket.emit('board:join', { boardId });
    };

    const onConnectError = (error: Error) => {
      console.error('[WS] connect_error:', error.message);
      scheduleReconnect();
    };

    const onDisconnect = () => {
      scheduleReconnect();
    };

    const onOnline = () => {
      void connectWithToken();
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    window.addEventListener('online', onOnline);

    if (socket.connected) {
      socket.emit('board:join', { boardId });
    } else {
      void connectWithToken();
    }

    socket.on('board:state', (board: Board) => {
      if (board.id !== boardId) return;
      qc.setQueryData(queryKeys.board(boardId), board);
    });

    socket.on('task:created', (payload: { boardId: string; task: Task }) => {
      if (payload.boardId !== boardId) return;
      qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
        addTaskToBoard(prev, payload.task),
      );
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    });

    socket.on(
      'task:update',
      (
        payload: {
          boardId: string;
          task: Task;
        },
      ) => {
        if (payload.boardId !== boardId) return;
        const updatedTask = payload.task;
        let didCompletionChange = false;

        qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) => {
          const currentTask = findTaskInBoard(prev, updatedTask.id);
          didCompletionChange =
            currentTask?.isCompleted !== undefined &&
            currentTask.isCompleted !== updatedTask.isCompleted;

          if (didCompletionChange && updatedTask.isCompleted) {
            return moveTaskToColumnEndInBoard(prev, updatedTask);
          }

          return updateTaskInBoard(prev, updatedTask);
        });

        if (didCompletionChange) {
          qc.invalidateQueries({
            queryKey: queryKeys.boardAnalytics(boardId),
          });
        }
        invalidateWorkspaceAnalyticsForBoard(qc, boardId);
      },
    );

    socket.on(
      'task:moved',
      (payload: {
        boardId: string;
        task: Task;
        taskIdsByColumn?: Record<string, string[]>;
      }) => {
        if (payload.boardId !== boardId) return;
        const updatedTask = payload.task;
        qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns?.map((col) => {
              const tasksWithoutMoved = (col.tasks ?? []).filter(
                (task) => task.id !== updatedTask.id,
              );
              const tasks =
                col.id === updatedTask.columnId
                  ? [...tasksWithoutMoved, updatedTask]
                  : tasksWithoutMoved;

              return {
                ...col,
                tasks: applyTaskOrder(tasks, payload.taskIdsByColumn?.[col.id]),
              };
            }),
          };
        });
        invalidateWorkspaceAnalyticsForBoard(qc, boardId);
      },
    );

    socket.on('task:deleted', (payload: { boardId: string; taskId: string }) => {
      if (payload.boardId !== boardId) return;
      qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
        removeTaskFromBoard(prev, payload.taskId),
      );
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    });

    socket.on('board:activity', (payload: { boardId: string; activity: BoardActivity }) => {
      if (payload.boardId !== boardId) return;
      qc.setQueryData(
        queryKeys.boardActivities(boardId),
        (prev: BoardActivity[] | undefined) =>
          prev ? [payload.activity, ...prev] : [payload.activity],
      );
      if (
        payload.activity.event === 'task_updated' &&
        hasTaskDetailActivityChange(payload.activity.metadata)
      ) {
        void qc.invalidateQueries({
          queryKey: queryKeys.board(boardId),
          exact: true,
        });
      }
    });

    socket.on(
      'task:reordered',
      ({
        boardId: eventBoardId,
        columnId,
        taskIds,
      }: {
        boardId: string;
        columnId: string;
        taskIds: string[];
      }) => {
        if (eventBoardId !== boardId) return;
        qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns?.map((col) => {
              if (col.id !== columnId) return col;
              return {
                ...col,
                tasks: applyTaskOrder(col.tasks ?? [], taskIds),
              };
            }),
          };
        });
        invalidateWorkspaceAnalyticsForBoard(qc, boardId);
      },
    );

    socket.on(
      'task:comment:created',
      (payload: { boardId: string; taskId: string; comment: TaskComment }) => {
        if (payload.boardId !== boardId) return;
        qc.setQueryData(
          queryKeys.taskComments(payload.taskId),
          (prev: TaskComment[] | undefined) => {
            const withoutDuplicate = (prev ?? []).filter(
              (comment) => comment.id !== payload.comment.id,
            );
            return [...withoutDuplicate, payload.comment].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
          },
        );
      },
    );

    socket.on(
      'task:comment:updated',
      (payload: { boardId: string; taskId: string; comment: TaskComment }) => {
        if (payload.boardId !== boardId) return;
        qc.setQueryData(
          queryKeys.taskComments(payload.taskId),
          (prev: TaskComment[] | undefined) =>
            prev?.map((comment) =>
              comment.id === payload.comment.id ? payload.comment : comment,
            ) ?? [payload.comment],
        );
      },
    );

    socket.on(
      'task:comment:deleted',
      (payload: { boardId: string; taskId: string; commentId: string }) => {
        if (payload.boardId !== boardId) return;
        qc.setQueryData(
          queryKeys.taskComments(payload.taskId),
          (prev: TaskComment[] | undefined) =>
            prev?.filter((comment) => comment.id !== payload.commentId) ?? [],
        );
      },
    );

    return () => {
      isActive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.emit('board:leave', { boardId });
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('board:state');
      socket.off('task:created');
      socket.off('task:update');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('board:activity');
      socket.off('task:reordered');
      socket.off('task:comment:created');
      socket.off('task:comment:updated');
      socket.off('task:comment:deleted');
      window.removeEventListener('online', onOnline);
    };
  }, [boardId, isOnline, qc]);
};
