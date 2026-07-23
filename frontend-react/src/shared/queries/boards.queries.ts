import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Board,
  BoardColumn,
  BoardViewPayload,
  boardsApi,
  columnsApi,
  Task,
  taskApi,
} from '../api/api';
import { ApiBody } from '../api/types';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './board-query-keys';
import {
  normalizeBoard,
  normalizeBoards,
} from '../lib/board-capabilities';

export { queryKeys };

const invalidateBoards = (qc: QueryClient) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boards });
};

const invalidateBoard = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.board(boardId) });
};

const invalidateBoardWithList = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boards });
  void qc.invalidateQueries({ queryKey: queryKeys.board(boardId) });
};

const invalidateBoardMembers = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boardMembers(boardId) });
};

const invalidateBoardViews = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boardViews(boardId) });
};

const invalidateBoardActivities = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boardActivities(boardId) });
};

const invalidateBoardAnalytics = (qc: QueryClient, boardId: string) => {
  void qc.invalidateQueries({ queryKey: queryKeys.boardAnalytics(boardId) });
};

export const invalidateWorkspaceAnalyticsForBoard = (
  qc: QueryClient,
  boardId: string,
) => {
  const board = qc.getQueryData<Board>(queryKeys.board(boardId));
  if (!board?.workspaceId) return;
  void qc.invalidateQueries({
    queryKey: queryKeys.workspaceAnalytics(board.workspaceId),
  });
};

const hasCompletionChange = (data: Partial<Task>) =>
  Object.prototype.hasOwnProperty.call(data, 'isCompleted') ||
  Object.prototype.hasOwnProperty.call(data, 'completedAt');

export const findTaskInBoard = (board: Board | undefined, taskId: string) =>
  board?.columns
    ?.flatMap((column) => column.tasks ?? [])
    .find((task) => task.id === taskId);

export const updateTaskInBoard = (
  board: Board | undefined,
  updatedTask: Task,
): Board | undefined => {
  if (!board) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => ({
      ...column,
      tasks: column.tasks?.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
      ),
    })),
  };
};

export const removeTaskAttachmentFromBoard = (
  board: Board | undefined,
  taskId: string,
  attachmentId: string,
): Board | undefined => {
  if (!board) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => ({
      ...column,
      tasks: column.tasks?.map((task) =>
        task.id === taskId
          ? {
              ...task,
              attachments: task.attachments?.filter(
                (attachment) => attachment.id !== attachmentId,
              ),
            }
          : task,
      ),
    })),
  };
};

export const addTaskToBoard = (
  board: Board | undefined,
  taskToAdd: Task,
): Board | undefined => {
  if (!board) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => {
      const tasksWithoutDuplicate = (column.tasks ?? []).filter(
        (task) => task.id !== taskToAdd.id,
      );

      if (column.id !== taskToAdd.columnId) {
        return {
          ...column,
          tasks: tasksWithoutDuplicate,
        };
      }

      return {
        ...column,
        tasks: [...tasksWithoutDuplicate, taskToAdd].sort(
          (a, b) => a.order - b.order,
        ),
      };
    }),
  };
};

export const removeTaskFromBoard = (
  board: Board | undefined,
  taskId: string,
): Board | undefined => {
  if (!board) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => ({
      ...column,
      tasks: (column.tasks ?? []).filter((task) => task.id !== taskId),
    })),
  };
};

export const moveTaskToColumnEndInBoard = (
  board: Board | undefined,
  updatedTask: Task,
): Board | undefined => {
  if (!board) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => {
      const tasks = column.tasks ?? [];
      const currentTask = tasks.find((task) => task.id === updatedTask.id);

      if (!currentTask) return column;

      const reorderedTasks = [
        ...tasks.filter((task) => task.id !== updatedTask.id),
        { ...currentTask, ...updatedTask },
      ].map((task, order) => ({ ...task, order }));

      return {
        ...column,
        tasks: reorderedTasks,
      };
    }),
  };
};

export const moveTaskToColumnInBoard = (
  board: Board | undefined,
  taskId: string,
  columnId: string,
): Board | undefined => {
  if (!board) return board;

  const taskToMove = board.columns
    ?.flatMap((column) => column.tasks ?? [])
    .find((task) => task.id === taskId);

  if (!taskToMove || taskToMove.columnId === columnId) return board;

  return {
    ...board,
    columns: board.columns?.map((column) => {
      const withoutMovedTask = (column.tasks ?? []).filter(
        (task) => task.id !== taskId,
      );

      if (column.id !== columnId) {
        return {
          ...column,
          tasks: withoutMovedTask.map((task, order) => ({ ...task, order })),
        };
      }

      return {
        ...column,
        tasks: [
          ...withoutMovedTask,
          {
            ...taskToMove,
            columnId,
            order: withoutMovedTask.length,
          },
        ],
      };
    }),
  };
};

export const useBoards = () => {
  return useQuery({
    queryKey: queryKeys.boards,
    queryFn: () => boardsApi.getAll().then((r) => r.data),
    select: normalizeBoards,
    staleTime: 60_000,
  });
};

export const useBoard = (id: string, initialData?: Board) => {
  return useQuery({
    queryKey: queryKeys.board(id),
    queryFn: async () => {
      const res = await boardsApi.getOne(id);
      return res.data;
    },
    initialData,
    select: normalizeBoard,
    staleTime: 30_000,
    enabled: !!id,
  });
};

export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      color?: string;
      template: ApiBody<'/api/boards', 'post'>['template'];
      workspaceId?: string;
    }) => boardsApi.create(data).then((r) => r.data),
    onSuccess: () => invalidateBoards(qc),
  });
};

export const useUpdateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Board> }) =>
      boardsApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => invalidateBoardWithList(qc, id),
  });
};

export const useDeleteBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => boardsApi.remove(id),
    onSuccess: (_, id) => {
      invalidateBoards(qc);
      qc.removeQueries({ queryKey: queryKeys.board(id) });
    },
  });
};

export const useCreateColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; boardId: string }) =>
      columnsApi.create(data).then((r) => r.data),
    onSuccess: (col) => invalidateBoard(qc, col.boardId),
  });
};

export const useUpdateColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BoardColumn>;
      boardId: string;
    }) => columnsApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { boardId }) => invalidateBoard(qc, boardId),
  });
};

export const useDeleteColumn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      columnsApi.remove(id).then(() => boardId),
    onSuccess: (boardId) => invalidateBoard(qc, boardId),
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      columnId: string;
      boardId: string;
      description?: string;
      priority?: Task['priority'];
      labels?: string[];
      dueDate?: string;
      assigneeId?: string;
      teamId?: string | null;
    }) =>
      taskApi
        .create({
          title: data.title,
          columnId: data.columnId,
          description: data.description,
          priority: data.priority,
          labels: data.labels,
          dueDate: data.dueDate,
          assigneeId: data.assigneeId,
          teamId: data.teamId,
        })
        .then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Task>;
      boardId: string;
    }) => taskApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { boardId, data }) => {
      invalidateBoard(qc, boardId);
      if (hasCompletionChange(data)) {
        invalidateBoardAnalytics(qc, boardId);
      }
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useCreateTaskChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      title,
      assigneeId,
    }: {
      taskId: string;
      title: string;
      assigneeId?: string | null;
      boardId: string;
    }) =>
      taskApi
        .createChecklistItem(taskId, { title, assigneeId })
        .then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateBoardActivities(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useUpdateTaskChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      itemId,
      data,
    }: {
      taskId: string;
      itemId: string;
      data: {
        title?: string;
        isDone?: boolean;
        order?: number;
        assigneeId?: string | null;
      };
      boardId: string;
    }) =>
      taskApi
        .updateChecklistItem(taskId, itemId, data)
        .then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateBoardActivities(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useDeleteTaskChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      itemId,
    }: {
      taskId: string;
      itemId: string;
      boardId: string;
    }) => taskApi.removeChecklistItem(taskId, itemId),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateBoardActivities(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useReorderTaskChecklistItems = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      itemIds,
    }: {
      taskId: string;
      itemIds: string[];
      boardId: string;
    }) => taskApi.reorderChecklistItems(taskId, itemIds).then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateBoardActivities(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useUploadTaskAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      file,
      onProgress,
    }: {
      taskId: string;
      file: File;
      boardId: string;
      onProgress?: (progress: number) => void;
    }) =>
      taskApi
        .uploadAttachment(taskId, file, (event) => {
          const total = event.total ?? file.size;
          if (!total) return;
          onProgress?.(
            Math.min(100, Math.round((event.loaded / total) * 100)),
          );
        })
        .then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateBoardActivities(qc, boardId);
    },
  });
};

export const useDeleteTaskAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      attachmentId,
    }: {
      taskId: string;
      attachmentId: string;
      boardId: string;
    }) => taskApi.removeAttachment(taskId, attachmentId),
    onMutate: async ({ boardId, taskId, attachmentId }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.board(boardId),
        exact: true,
      });
      const previousBoard = qc.getQueryData<Board>(queryKeys.board(boardId));

      qc.setQueryData(queryKeys.board(boardId), (prev: Board | undefined) =>
        removeTaskAttachmentFromBoard(prev, taskId, attachmentId),
      );

      return { previousBoard };
    },
    onError: (_error, { boardId }, context) => {
      if (context?.previousBoard) {
        qc.setQueryData(queryKeys.board(boardId), context.previousBoard);
      }
    },
    onSuccess: (_, { boardId }) => {
      invalidateBoardActivities(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useMoveTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      columnId,
      order,
    }: {
      id: string;
      columnId: string;
      order: number;
      boardId: string;
    }) => taskApi.move(id, { columnId, order }).then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoard(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      taskApi.remove(id).then(() => boardId),
    onSuccess: (boardId) => {
      invalidateBoard(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useShareBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      boardId: string;
      email?: string;
      userId?: string;
      role?: 'editor' | 'viewer';
    }) =>
      boardsApi
        .share(params.boardId, {
          email: params.email,
          userId: params.userId,
          role: params.role ?? 'editor',
        })
        .then((r) => r.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoardWithList(qc, boardId);
      invalidateBoardMembers(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useBoardMembers = (boardId: string) => {
  return useQuery({
    queryKey: queryKeys.boardMembers(boardId),
    queryFn: () => boardsApi.getMembers(boardId).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};

export const useBoardActivities = (boardId: string) => {
  return useQuery({
    queryKey: queryKeys.boardActivities(boardId),
    queryFn: () => boardsApi.getActivities(boardId).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 30_000,
  });
};

export const useBoardViews = (boardId: string) => {
  return useQuery({
    queryKey: queryKeys.boardViews(boardId),
    queryFn: () => boardsApi.getViews(boardId).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};

export const useCreateBoardView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      data,
    }: {
      boardId: string;
      data: BoardViewPayload;
    }) => boardsApi.createView(boardId, data).then((r) => r.data),
    onSuccess: (_, { boardId }) => invalidateBoardViews(qc, boardId),
  });
};

export const useUpdateBoardView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      viewId,
      data,
    }: {
      boardId: string;
      viewId: string;
      data: Partial<BoardViewPayload>;
    }) => boardsApi.updateView(boardId, viewId, data).then((r) => r.data),
    onSuccess: (_, { boardId }) => invalidateBoardViews(qc, boardId),
  });
};

export const useDeleteBoardView = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      viewId,
    }: {
      boardId: string;
      viewId: string;
    }) => boardsApi.deleteView(boardId, viewId),
    onSuccess: (_, { boardId }) => invalidateBoardViews(qc, boardId),
  });
};

export const useRevokeBoardMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      memberId,
    }: {
      boardId: string;
      memberId: string;
    }) => boardsApi.revokeMember(boardId, memberId),
    onSuccess: (_, { boardId }) => {
      invalidateBoardWithList(qc, boardId);
      invalidateBoardMembers(qc, boardId);
      invalidateWorkspaceAnalyticsForBoard(qc, boardId);
    },
  });
};

export const useUpdateBoardMemberRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      memberId,
      role,
    }: {
      boardId: string;
      memberId: string;
      role: 'editor' | 'viewer';
    }) =>
      boardsApi
        .updateMemberRole(boardId, memberId, role)
        .then((response) => response.data),
    onSuccess: (_, { boardId }) => {
      invalidateBoardWithList(qc, boardId);
      invalidateBoardMembers(qc, boardId);
    },
  });
};

export const useBoardDailyAnalytics = (boardId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.boardAnalytics(boardId), 'daily'],
    queryFn: () => taskApi.analytics.daily({ boardId }).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};

export const useBoardWeeklyAnalytics = (boardId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.boardAnalytics(boardId), 'weekly'],
    queryFn: () => taskApi.analytics.weekly({ boardId }).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};

export const useBoardMonthlyAnalytics = (boardId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.boardAnalytics(boardId), 'monthly'],
    queryFn: () => taskApi.analytics.monthly({ boardId }).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};

export const useTaskCompletionSummary = (boardId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.boardAnalytics(boardId), 'summary'],
    queryFn: () => taskApi.analytics.summary({ boardId }).then((r) => r.data),
    enabled: !!boardId,
    staleTime: 60_000,
  });
};
