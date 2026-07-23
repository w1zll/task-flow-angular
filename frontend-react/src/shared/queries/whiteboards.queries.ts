import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Whiteboard,
  WhiteboardOperation,
  WhiteboardPayload,
  WhiteboardState,
  whiteboardsApi,
} from '../api/api';
import { queryKeys } from './board-query-keys';

const invalidateWorkspaceWhiteboards = (
  workspaceId: string,
  boardId?: string | null,
) => ({
  queryKey: queryKeys.workspaceWhiteboards(workspaceId, boardId ?? undefined),
});

export const useWorkspaceWhiteboards = (
  workspaceId: string,
  boardId?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.workspaceWhiteboards(workspaceId, boardId),
    queryFn: () =>
      whiteboardsApi
        .getAll(workspaceId, boardId ? { boardId } : undefined)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId,
    staleTime: 30_000,
  });

export const useWhiteboard = (
  workspaceId: string,
  whiteboardId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.whiteboard(workspaceId, whiteboardId),
    queryFn: () =>
      whiteboardsApi
        .getOne(workspaceId, whiteboardId)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId && !!whiteboardId,
    staleTime: 30_000,
  });

export const useWhiteboardState = (
  workspaceId: string,
  whiteboardId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.whiteboardState(workspaceId, whiteboardId),
    queryFn: () =>
      whiteboardsApi
        .getState(workspaceId, whiteboardId)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId && !!whiteboardId,
    staleTime: 15_000,
  });

export const appendOperationToState = (
  state: WhiteboardState | undefined,
  operation: WhiteboardOperation,
): WhiteboardState | undefined => {
  if (!state) return state;
  if (operation.whiteboardId !== state.whiteboard.id) return state;

  const snapshotOperations = state.snapshot?.data.operations ?? [];
  const existsInSnapshot = snapshotOperations.some(
    (item) => item.id === operation.id,
  );
  const existsInTail = state.operations.some((item) => item.id === operation.id);
  if (existsInSnapshot || existsInTail) return state;

  return {
    ...state,
    whiteboard: {
      ...state.whiteboard,
      lastSequence: Math.max(
        state.whiteboard.lastSequence,
        operation.sequence,
      ),
    },
    operations: [...state.operations, operation].sort(
      (a, b) => a.sequence - b.sequence,
    ),
    latestSequence: Math.max(state.latestSequence, operation.sequence),
  };
};

export const useCreateWhiteboard = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WhiteboardPayload) =>
      whiteboardsApi.create(workspaceId, data).then((response) => response.data),
    onSuccess: (whiteboard) => {
      void queryClient.invalidateQueries(
        invalidateWorkspaceWhiteboards(workspaceId),
      );
      if (whiteboard.boardId) {
        void queryClient.invalidateQueries(
          invalidateWorkspaceWhiteboards(workspaceId, whiteboard.boardId),
        );
      }
    },
  });
};

export const useUpdateWhiteboard = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      whiteboardId,
      data,
    }: {
      whiteboardId: string;
      data: Partial<WhiteboardPayload>;
    }) =>
      whiteboardsApi
        .update(workspaceId, whiteboardId, data)
        .then((response) => response.data),
    onSuccess: (whiteboard) => {
      queryClient.setQueryData(
        queryKeys.whiteboard(workspaceId, whiteboard.id),
        whiteboard,
      );
      void queryClient.invalidateQueries(
        invalidateWorkspaceWhiteboards(workspaceId),
      );
      if (whiteboard.boardId) {
        void queryClient.invalidateQueries(
          invalidateWorkspaceWhiteboards(workspaceId, whiteboard.boardId),
        );
      }
    },
  });
};

export const useDeleteWhiteboard = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (whiteboard: Pick<Whiteboard, 'id' | 'boardId'>) =>
      whiteboardsApi
        .remove(workspaceId, whiteboard.id)
        .then(() => whiteboard),
    onSuccess: (whiteboard) => {
      void queryClient.invalidateQueries(
        invalidateWorkspaceWhiteboards(workspaceId),
      );
      if (whiteboard.boardId) {
        void queryClient.invalidateQueries(
          invalidateWorkspaceWhiteboards(workspaceId, whiteboard.boardId),
        );
      }
      queryClient.removeQueries({
        queryKey: queryKeys.whiteboard(workspaceId, whiteboard.id),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.whiteboardState(workspaceId, whiteboard.id),
      });
    },
  });
};
