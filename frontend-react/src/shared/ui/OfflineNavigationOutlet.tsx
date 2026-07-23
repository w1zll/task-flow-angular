'use client';

import type { Board } from '@/shared/api/api';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  type OfflineNavigationView,
  useOfflineBoardNavigationStore,
} from '@/shared/store/offline-board-navigation.store';
import BoardsClientPage from '@/widgets/boards/BoardsClientPage';
import KanbanBoardPage from '@/widgets/kanban/KanbanBoardPage';
import WorkspaceShell from '@/widgets/workspaces/WorkspaceShell';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

const getViewHref = (
  view: OfflineNavigationView,
  board?: Board,
) => {
  if (view.type === 'catalog') {
    return view.workspaceId
      ? `/workspaces/${view.workspaceId}/boards`
      : '/workspaces';
  }

  return board
    ? `/workspaces/${board.workspaceId}/boards/${board.id}`
    : '/workspaces';
};

const OfflineNavigationOutlet = ({ children }: { children: ReactNode }) => {
  const isOffline = useIsOffline();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = useOfflineBoardNavigationStore((state) => state.view);
  const clearSelection = useOfflineBoardNavigationStore(
    (state) => state.clearSelection,
  );
  const board =
    view?.type === 'board'
      ? queryClient.getQueryData<Board>(queryKeys.board(view.boardId))
      : undefined;
  const targetHref = view ? getViewHref(view, board) : null;

  useEffect(() => {
    if (!view || isOffline || !targetHref) return;

    if (pathname === targetHref) {
      clearSelection();
      return;
    }

    router.replace(targetHref);
  }, [
    clearSelection,
    isOffline,
    pathname,
    router,
    targetHref,
    view,
  ]);

  if (!view) return children;

  if (view.type === 'catalog') {
    return <BoardsClientPage workspaceId={view.workspaceId} />;
  }

  if (!board) return children;

  return (
    <WorkspaceShell workspaceId={board.workspaceId}>
      <KanbanBoardPage boardId={board.id} />
    </WorkspaceShell>
  );
};

export default OfflineNavigationOutlet;
