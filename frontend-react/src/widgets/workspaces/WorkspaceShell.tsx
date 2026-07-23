'use client';

import type { Board } from '@/shared/api/api';
import { useBoards } from '@/shared/queries/boards.queries';
import { useCachedBoardDetailIds } from '@/shared/hooks/useCachedBoardDetailIds';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  useSwitchWorkspace,
  useWorkspaces,
} from '@/shared/queries/workspaces.queries';
import { useAuthStore } from '@/shared/store/root.store';
import { useOfflineBoardNavigationStore } from '@/shared/store/offline-board-navigation.store';
import BoardCreateDialog from '@/widgets/boards/BoardCreateDialog';
import { Box } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import DemoWorkspaceBanner from './DemoWorkspaceBanner';
import WorkspaceDesktopDrawer from './workspace-shell/WorkspaceDesktopDrawer';
import WorkspaceMenu from './workspace-shell/WorkspaceMenu';
import WorkspaceMobileDrawer from './workspace-shell/WorkspaceMobileDrawer';
import WorkspaceMobileHeader from './workspace-shell/WorkspaceMobileHeader';
import WorkspaceSidebar from './workspace-shell/WorkspaceSidebar';
import { getActiveNavKey } from './workspace-shell/navigation';

interface Props {
  workspaceId: string;
  children: ReactNode;
}

const WorkspaceShell = ({ workspaceId, children }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const isOffline = useIsOffline();
  const cachedBoardDetailIds = useCachedBoardDetailIds();
  const boardsT = useTranslations('Boards');
  const shellT = useTranslations('WorkspaceShell');
  const { enqueueSnackbar } = useSnackbar();
  const setActiveWorkspace = useAuthStore(
    (state) => state.setActiveWorkspace,
  );
  const offlineBoardId = useOfflineBoardNavigationStore(
    (state) =>
      state.view?.type === 'board' ? state.view.boardId : null,
  );
  const selectOfflineBoard = useOfflineBoardNavigationStore(
    (state) => state.selectBoard,
  );
  const { data: workspaces = [] } = useWorkspaces();
  const { data: boards = [] } = useBoards();
  const {
    mutate: switchActiveWorkspace,
    isPending: isSwitchingWorkspace,
  } = useSwitchWorkspace();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);

  const workspace = workspaces.find((item) => item.id === workspaceId);
  const workspaceBoards = useMemo(
    () =>
      boards
        .filter((board) => board.workspaceId === workspaceId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        ),
    [boards, workspaceId],
  );
  const isDemoWorkspace = Boolean(
    workspace?.isDemoTemplate || workspace?.isDemoInstance,
  );
  const activeNavKey = getActiveNavKey(pathname, workspaceId);
  const routeBoardId = pathname.match(
    new RegExp(`/workspaces/${workspaceId}/boards/([^/]+)`),
  )?.[1];
  const activeBoardId = offlineBoardId ?? routeBoardId;

  useEffect(() => {
    if (!workspace || workspace.isActive || isSwitchingWorkspace || isOffline) {
      return;
    }

    switchActiveWorkspace(workspaceId, {
      onSuccess: (updatedWorkspace) =>
        setActiveWorkspace(updatedWorkspace.id),
    });
  }, [
    isSwitchingWorkspace,
    setActiveWorkspace,
    switchActiveWorkspace,
    workspace,
    workspaceId,
    isOffline,
  ]);

  const closeMobile = () => setMobileOpen(false);
  const closeWorkspaceMenu = () => setWorkspaceMenuAnchor(null);

  const selectWorkspace = (nextWorkspaceId: string) => {
    closeWorkspaceMenu();
    closeMobile();
    if (isOffline) {
      notifyOfflineSectionUnavailable();
      return;
    }
    router.push(`/workspaces/${nextWorkspaceId}`);
  };
  const notifyOfflineBoardUnavailable = () => {
    enqueueSnackbar(boardsT('offlineBoardUnavailable'), { variant: 'warning' });
  };
  const notifyOfflineSectionUnavailable = () => {
    enqueueSnackbar(shellT('offlineSectionUnavailable'), {
      variant: 'warning',
    });
  };

  const sidebarProps = {
    workspaceId,
    workspace,
    boards: workspaceBoards,
    activeNavKey,
    activeBoardId,
    onCloseNavigation: closeMobile,
    onOpenCreateBoard: () => {
      if (!isOffline) setCreateBoardOpen(true);
    },
    onOpenWorkspaceMenu: setWorkspaceMenuAnchor,
    canCreateBoard: !isOffline,
    isOffline,
    cachedBoardIds: cachedBoardDetailIds,
    onOpenUnavailableBoard: notifyOfflineBoardUnavailable,
    onOpenCachedBoardOffline: (board: Board) => {
      if (!isOffline || !routeBoardId) return false;

      selectOfflineBoard(board.id);
      return true;
    },
    onOpenUnavailableSection: notifyOfflineSectionUnavailable,
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          height: {
            xs: 'calc(100dvh - 56px)',
            sm: 'calc(100dvh - 64px)',
          },
          minHeight: 0,
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <WorkspaceDesktopDrawer>
          <WorkspaceSidebar {...sidebarProps} />
        </WorkspaceDesktopDrawer>

        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <WorkspaceMobileHeader
            workspace={workspace}
            activeNavKey={activeNavKey}
            onOpenNavigation={() => setMobileOpen(true)}
          />
          {workspace && isDemoWorkspace && (
            <DemoWorkspaceBanner />
          )}
          {children}
        </Box>
      </Box>

      <WorkspaceMobileDrawer open={isMobileOpen} onClose={closeMobile}>
        <WorkspaceSidebar {...sidebarProps} />
      </WorkspaceMobileDrawer>

      <WorkspaceMenu
        anchorEl={workspaceMenuAnchor}
        selectedWorkspaceId={workspaceId}
        workspaces={workspaces}
        onClose={closeWorkspaceMenu}
        onSelectWorkspace={selectWorkspace}
      />

      <BoardCreateDialog
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
        workspaces={workspaces}
        defaultWorkspaceId={workspaceId}
        lockWorkspace
        disabled={isOffline}
      />
    </>
  );
};

export default WorkspaceShell;
