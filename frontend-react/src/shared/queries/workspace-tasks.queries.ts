'use client';

import { Board, boardsApi } from '@/shared/api/api';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { useQueries } from '@tanstack/react-query';
import { queryKeys } from './board-query-keys';

export type WorkspaceTask = NonNullable<
  NonNullable<Board['columns']>[number]['tasks']
>[number] & {
  boardId: string;
  boardTitle: string;
  boardColor: string;
  columnId: string;
  columnTitle: string;
};

export const useWorkspaceBoardDetails = (
  workspaceId: string,
  boards: Board[] = [],
) => {
  const isOffline = useIsOffline();
  const workspaceBoards = boards.filter(
    (board) => board.workspaceId === workspaceId,
  );

  return useQueries({
    queries: workspaceBoards.map((board) => ({
      queryKey: queryKeys.board(board.id),
      queryFn: () => boardsApi.getOne(board.id).then((response) => response.data),
      staleTime: 30_000,
      enabled: Boolean(workspaceId) && !isOffline,
    })),
  });
};

export const getWorkspaceTasksFromBoards = (
  boardDetails: Board[],
): WorkspaceTask[] =>
  boardDetails.flatMap((board) =>
    (board.columns ?? []).flatMap((column) =>
      (column.tasks ?? []).map((task) => ({
        ...task,
        boardId: board.id,
        boardTitle: board.title,
        boardColor: board.color ?? '#669266',
        columnId: column.id,
        columnTitle: column.title,
      })),
    ),
  );
