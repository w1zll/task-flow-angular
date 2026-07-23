'use client';

import type { Board } from '@/shared/api/api';
import { useAuth } from '@/features/auth/useAuth';
import { getAvailableWorkspaceMembers } from '@/shared/lib/board-members';
import { normalizeBoard } from '@/shared/lib/board-capabilities';
import { isBoardPermissionError } from '@/shared/lib/boardSocketMutations';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  useBoard,
  useBoardActivities,
  useBoardMembers,
  useBoards,
  useCreateColumn,
  useRevokeBoardMember,
  useShareBoard,
  useUpdateBoardMemberRole,
} from '@/shared/queries/boards.queries';
import {
  useMyWorkspaceTeams,
  useWorkspaceTeams,
} from '@/shared/queries/teams.queries';
import { useNotifications } from '@/shared/queries/notifications.queries';
import { useWorkspaceMembers } from '@/shared/queries/workspaces.queries';
import { useBoardUIStore } from '@/shared/store/root.store';
import { Alert, Box } from '@mui/material';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BoardFiltersToolbar from './BoardFiltersToolbar';
import BoardPlanningSection from './BoardPlanningSection';
import {
  countBoardTasks,
  filterBoard,
  isBoardReorderDisabledByView,
} from './board-filters';
import BoardCanvasSection from './kanban-board-page/BoardCanvasSection';
import BoardMembersDrawer from './kanban-board-page/BoardMembersDrawer';
import BoardNotFoundState from './kanban-board-page/BoardNotFoundState';
import BoardPageHeader from './kanban-board-page/BoardPageHeader';
import { useBoardFiltersController } from './kanban-board-page/useBoardFiltersController';
import TaskDetailModal from './TaskDetailModal';
import BoardActivityDrawer from './kanban-board-page/BoardActivityDrawer';
import BoardWhiteboardsSection from '@/widgets/whiteboards/BoardWhiteboardsSection';
import { useOfflineBoardNavigationStore } from '@/shared/store/offline-board-navigation.store';
import { useBoardLayoutController } from './kanban-board-page/useBoardLayoutController';
import { useWorkspaceWhiteboards } from '@/shared/queries/whiteboards.queries';
import WhiteboardAttachDialog from '@/widgets/whiteboards/WhiteboardAttachDialog';
import WhiteboardCreateDialog from '@/widgets/whiteboards/WhiteboardCreateDialog';
import MobileBoardToolsDrawer from './kanban-board-page/MobileBoardToolsDrawer';
import { countActiveBoardFilters } from './board-filters';

interface Props {
  boardId: string;
  initialBoard?: Board;
}

const KanbanBoardPage = ({ boardId: serverBoardId, initialBoard }: Props) => {
  const locale = useLocale();
  const t = useTranslations('BoardPage');
  const shellT = useTranslations('WorkspaceShell');
  const router = useRouter();
  const pathname = usePathname();
  const offlineBoardId = useOfflineBoardNavigationStore(
    (state) =>
      state.view?.type === 'board' ? state.view.boardId : null,
  );
  const boardId = offlineBoardId ?? serverBoardId;
  const matchingInitialBoard = useMemo(
    () =>
      initialBoard?.id === boardId ? normalizeBoard(initialBoard) : undefined,
    [boardId, initialBoard],
  );
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const isOffline = useIsOffline();
  const isRestoring = useIsRestoring();
  const [isInitialBoardSynced, setInitialBoardSynced] = useState(
    !matchingInitialBoard,
  );
  const {
    data: queriedBoard,
    isLoading: isBoardQueryLoading,
    isError,
  } = useBoard(boardId, matchingInitialBoard);
  const board = isInitialBoardSynced ? queriedBoard : matchingInitialBoard;
  const isBoardLoading =
    isRestoring || (!isOffline && isBoardQueryLoading);
  const createColumn = useCreateColumn();
  const isAddingColumn = useBoardUIStore((state) => state.isAddingColumn);
  const closeTask = useBoardUIStore((state) => state.closeTask);
  const openTaskId = useBoardUIStore((state) => state.openTaskId);
  const openTask = useBoardUIStore((state) => state.openTask);
  const setAddingColumn = useBoardUIStore((state) => state.setAddingColumn);
  const setAddingTaskInColumn = useBoardUIStore(
    (state) => state.setAddingTaskInColumn,
  );
  const { user: currentUser } = useAuth();

  const [newColTitle, setNewColTitle] = useState('');
  const [isMembersOpen, setMembersOpen] = useState(false);
  const [isActivityOpen, setActivityOpen] = useState(false);
  const [isMobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [isWhiteboardCreateOpen, setWhiteboardCreateOpen] = useState(false);
  const [isWhiteboardAttachOpen, setWhiteboardAttachOpen] = useState(false);
  const [shareUserId, setShareUserId] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);
  const [hasBoardHorizontalOverflow, setHasBoardHorizontalOverflow] =
    useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(
    null,
  );
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const boardTopScrollRef = useRef<HTMLDivElement | null>(null);
  const boardContentRef = useRef<HTMLDivElement | null>(null);

  const boardMembers = useBoardMembers(boardId);
  const boards = useBoards();
  const boardActivities = useBoardActivities(boardId);
  const shareBoard = useShareBoard();
  const revokeMember = useRevokeBoardMember();
  const updateMemberRole = useUpdateBoardMemberRole();
  const {
    boardFilters,
    boardViews,
    selectedViewId,
    taskToHighlightId,
    isFiltering,
    createBoardView,
    deleteBoardView,
    updateBoardFilters,
    resetBoardFilters,
    applySavedView,
    saveCurrentView,
    removeSavedView,
  } = useBoardFiltersController(boardId);
  const { boardLayout, setBoardLayout } = useBoardLayoutController();
  const linkedWhiteboards = useWorkspaceWhiteboards(
    board?.workspaceId ?? '',
    board?.id,
    Boolean(board),
  );
  const roleCanEditBoardContent =
    board?.capabilities?.canEditBoardContent ?? false;
  const roleCanManageColumns =
    board?.capabilities?.canManageColumns ?? false;
  const roleCanManageBoardMembers =
    board?.capabilities?.canManageBoardMembers ?? false;
  const canEditBoardContent = roleCanEditBoardContent;
  const canManageColumns = roleCanManageColumns && !isOffline;
  const canManageBoardMembers = roleCanManageBoardMembers && !isOffline;
  const effectiveBoard = useMemo(
    () =>
      board
        ? {
            ...board,
            capabilities: {
              ...board.capabilities,
              canEditBoardContent,
              canManageBoardMembers,
              canManageColumns,
            },
          }
        : undefined,
    [board, canEditBoardContent, canManageBoardMembers, canManageColumns],
  );
  const workspaceMembers = useWorkspaceMembers(
    board?.workspaceId ?? '',
    isMembersOpen && canManageBoardMembers,
  );
  const workspaceTeams = useWorkspaceTeams(
    board?.workspaceId ?? '',
    Boolean(board?.workspaceId),
  );
  const myWorkspaceTeams = useMyWorkspaceTeams(
    board?.workspaceId ?? '',
    Boolean(board?.workspaceId),
  );
  const unreadNotifications = useNotifications(true, boardFilters.unread);
  const availableWorkspaceMembers = useMemo(
    () =>
      getAvailableWorkspaceMembers(
        workspaceMembers.data,
        boardMembers.data,
      ),
    [boardMembers.data, workspaceMembers.data],
  );
  const isShareMembersLoading =
    workspaceMembers.isLoading || boardMembers.isLoading;
  const isShareMembersError =
    workspaceMembers.isError || boardMembers.isError;
  const myTeamIds = useMemo(
    () => myWorkspaceTeams.data?.map((team) => team.id) ?? [],
    [myWorkspaceTeams.data],
  );
  const unreadTaskIds = useMemo(
    () =>
      unreadNotifications.data
        ?.filter(
          (notification) =>
            notification.boardId === boardId && Boolean(notification.taskId),
        )
        .map((notification) => notification.taskId as string) ?? [],
    [boardId, unreadNotifications.data],
  );
  const filteredBoard = useMemo(
    () =>
      effectiveBoard
        ? filterBoard(effectiveBoard, boardFilters, {
            currentUserId: currentUser?.id,
            myTeamIds,
            unreadTaskIds,
          })
        : undefined,
    [effectiveBoard, boardFilters, currentUser?.id, myTeamIds, unreadTaskIds],
  );
  const totalTaskCount = useMemo(() => countBoardTasks(board), [board]);
  const filteredTaskCount = useMemo(
    () => countBoardTasks(filteredBoard),
    [filteredBoard],
  );
  const existingTaskIds = useMemo(
    () =>
      new Set(
        board?.columns?.flatMap((column) =>
          (column.tasks ?? []).map((task) => task.id),
        ) ?? [],
      ),
    [board],
  );
  const isReorderDisabledByView =
    boardLayout === 'kanban' && isBoardReorderDisabledByView(boardFilters);
  const activeFilterCount = countActiveBoardFilters(boardFilters);
  const canCreateOrAttachWhiteboard =
    Boolean(board?.capabilities?.canUseWhiteboard) && !isOffline;

  useStableBodyScrollLock(isMembersOpen || isActivityOpen);

  useEffect(() => {
    if (!matchingInitialBoard) {
      setInitialBoardSynced(true);
      return;
    }

    qc.setQueryData(queryKeys.board(boardId), matchingInitialBoard);
    setInitialBoardSynced(true);
  }, [boardId, matchingInitialBoard, qc]);

  useEffect(() => {
    closeTask();
    setAddingColumn(false);
    setAddingTaskInColumn(null);
  }, [boardId, closeTask, setAddingColumn, setAddingTaskInColumn]);

  useEffect(() => {
    if (!canManageColumns) setAddingColumn(false);
    if (!canEditBoardContent) setAddingTaskInColumn(null);
  }, [
    canEditBoardContent,
    canManageColumns,
    setAddingColumn,
    setAddingTaskInColumn,
  ]);

  useEffect(() => {
    const content = boardContentRef.current;
    const scrollContainer = boardScrollRef.current;
    if (!content) return;

    const updateWidth = () => {
      const nextScrollWidth = content.scrollWidth;
      setBoardScrollWidth(nextScrollWidth);
      setHasBoardHorizontalOverflow(
        scrollContainer
          ? nextScrollWidth > scrollContainer.clientWidth + 1
          : false,
      );
    };
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(content);
    if (scrollContainer) observer.observe(scrollContainer);

    return () => observer.disconnect();
  }, [filteredBoard, isAddingColumn]);

  useEffect(() => {
    if (!taskToHighlightId || !board) return;

    if (existingTaskIds.has(taskToHighlightId)) {
      openTask(taskToHighlightId);
    }
    setHighlightedTaskId(taskToHighlightId);

    const scrollTimer = window.setTimeout(() => {
      document
        .getElementById(`task-${taskToHighlightId}`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
    }, 100);
    const highlightTimer = window.setTimeout(() => {
      setHighlightedTaskId((current) =>
        current === taskToHighlightId ? null : current,
      );
    }, 3000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [board, existingTaskIds, openTask, taskToHighlightId]);

  const handleOpenActivityTask = useCallback(
    (taskId: string) => {
      openTask(taskId);
      setActivityOpen(false);
      setHighlightedTaskId(taskId);

      if (isOffline) return;

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set('taskId', taskId);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      });
    },
    [isOffline, openTask, pathname, router, searchParams],
  );

  const handleCloseTask = useCallback(() => {
    closeTask();

    if (isOffline) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (!nextSearchParams.has('taskId')) return;

    nextSearchParams.delete('taskId');
    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [closeTask, isOffline, pathname, router, searchParams]);

  useEffect(() => {
    if (!board || !openTaskId) return;
    if (existingTaskIds.has(openTaskId)) return;

    handleCloseTask();
  }, [board, existingTaskIds, handleCloseTask, openTaskId]);

  const syncBoardScroll = () => {
    if (!boardScrollRef.current || !boardTopScrollRef.current) return;
    boardTopScrollRef.current.scrollLeft = boardScrollRef.current.scrollLeft;
  };

  const syncTopScroll = () => {
    if (!boardScrollRef.current || !boardTopScrollRef.current) return;
    boardScrollRef.current.scrollLeft = boardTopScrollRef.current.scrollLeft;
  };

  const handleShareBoard = () => {
    if (!canManageBoardMembers) return;
    if (!shareUserId) return;
    shareBoard.mutate(
      { boardId, userId: shareUserId, role: shareRole },
      {
        onSuccess: () => {
          setShareUserId('');
          setShareRole('editor');
          enqueueSnackbar(t('memberAdded'), { variant: 'success' });
        },
      },
    );
  };

  const handleAddColumn = () => {
    if (!canManageColumns) return;
    const title = newColTitle.trim();
    if (!title) return;
    createColumn.mutate(
      { title, boardId },
      {
        onSuccess: () => {
          setNewColTitle('');
          setAddingColumn(false);
        },
        onError: (error) => {
          if (isBoardPermissionError(error)) {
            void qc.invalidateQueries({
              queryKey: queryKeys.board(boardId),
              exact: true,
            });
          }
          enqueueSnackbar(
            t(
              isBoardPermissionError(error)
                ? 'permissionDenied'
                : 'columnCreateError',
            ),
            { variant: 'error' },
          );
        },
      },
    );
  };

  const openWhiteboard = (whiteboardId: string) => {
    if (!board) return;
    setMobileToolsOpen(false);
    if (isOffline) {
      enqueueSnackbar(shellT('offlineSectionUnavailable'), {
        variant: 'warning',
      });
      return;
    }
    router.push(
      `/workspaces/${board.workspaceId}/whiteboards/${whiteboardId}`,
    );
  };

  const openActivity = () => {
    setMobileToolsOpen(false);
    setMembersOpen(false);
    setActivityOpen(true);
  };

  const openMembers = () => {
    setMobileToolsOpen(false);
    setActivityOpen(false);
    setMembersOpen(true);
  };

  if (isError && !board) {
    return (
      <BoardNotFoundState
        onBack={() => {
          if (isOffline) {
            useOfflineBoardNavigationStore.getState().openCatalog();
            return;
          }
          router.push('/workspaces');
        }}
      />
    );
  }

  if (isOffline && !isRestoring && !board) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="info">
          {locale === 'ru'
            ? 'Эта доска ещё не сохранена для офлайн-просмотра. Подключитесь к сети и откройте её один раз.'
            : 'This board is not saved for offline viewing yet. Go online and open it once.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <BoardPageHeader
        board={board}
        isLoading={isBoardLoading}
        canManageColumns={canManageColumns}
        canEditBoardContent={canEditBoardContent}
        isMembersOpen={isMembersOpen}
        isActivityOpen={isActivityOpen}
        activeFilterCount={activeFilterCount}
        onAddColumn={() => setAddingColumn(true)}
        onToggleMembers={() => {
          setActivityOpen(false);
          setMembersOpen((open) => !open);
        }}
        onToggleActivity={() => {
          setMembersOpen(false);
          setActivityOpen((open) => !open);
        }}
        onOpenMobileTools={() => setMobileToolsOpen(true)}
      />

      {board && (
        <BoardWhiteboardsSection
          linkedWhiteboards={linkedWhiteboards.data ?? []}
          isError={linkedWhiteboards.isError}
          canCreateOrAttach={canCreateOrAttachWhiteboard}
          onOpenWhiteboard={openWhiteboard}
          onAttach={() => setWhiteboardAttachOpen(true)}
          onCreate={() => setWhiteboardCreateOpen(true)}
        />
      )}

      {board && (
        <BoardFiltersToolbar
          filters={boardFilters}
          onChange={updateBoardFilters}
          onReset={resetBoardFilters}
          layout={boardLayout}
          onLayoutChange={setBoardLayout}
          boardMembers={boardMembers.data}
          teams={workspaceTeams.data}
          filteredCount={filteredTaskCount}
          totalCount={totalTaskCount}
          isFiltering={isFiltering}
          isReorderDisabled={isReorderDisabledByView}
          savedViews={boardViews.data}
          selectedViewId={selectedViewId}
          isSavingView={createBoardView.isPending}
          isDeletingView={deleteBoardView.isPending}
          canManageSavedViews={!isOffline}
          onApplySavedView={applySavedView}
          onSaveView={saveCurrentView}
          onDeleteSavedView={removeSavedView}
        />
      )}

      {boardLayout === 'kanban' ? (
        <BoardCanvasSection
          boardId={boardId}
          isLoading={isBoardLoading}
          isFiltering={isFiltering}
          filteredBoard={filteredBoard}
          highlightedTaskId={highlightedTaskId}
          isReorderDisabled={isReorderDisabledByView}
          canManageColumns={canManageColumns}
          isAddingColumn={isAddingColumn}
          newColumnTitle={newColTitle}
          isCreatingColumn={createColumn.isPending}
          boardScrollWidth={boardScrollWidth}
          hasBoardHorizontalOverflow={hasBoardHorizontalOverflow}
          boardScrollRef={boardScrollRef}
          boardTopScrollRef={boardTopScrollRef}
          boardContentRef={boardContentRef}
          onBoardScroll={syncBoardScroll}
          onTopScroll={syncTopScroll}
          onNewColumnTitleChange={setNewColTitle}
          onAddColumn={handleAddColumn}
          onCancelAddColumn={() => setAddingColumn(false)}
        />
      ) : (
        <BoardPlanningSection
          boardId={boardId}
          layout={boardLayout}
          board={effectiveBoard}
          filteredBoard={filteredBoard}
          highlightedTaskId={highlightedTaskId}
          canEditBoardContent={canEditBoardContent}
          teams={workspaceTeams.data}
        />
      )}

      {board && (
        <MobileBoardToolsDrawer
          open={isMobileToolsOpen}
          activeFilterCount={activeFilterCount}
          filters={boardFilters}
          layout={boardLayout}
          boardMembers={boardMembers.data}
          teams={workspaceTeams.data}
          savedViews={boardViews.data}
          selectedViewId={selectedViewId}
          filteredCount={filteredTaskCount}
          totalCount={totalTaskCount}
          isSavingView={createBoardView.isPending}
          isDeletingView={deleteBoardView.isPending}
          canManageSavedViews={!isOffline}
          linkedWhiteboards={linkedWhiteboards.data ?? []}
          isWhiteboardsError={linkedWhiteboards.isError}
          canCreateOrAttachWhiteboard={canCreateOrAttachWhiteboard}
          canManageColumns={canManageColumns}
          onClose={() => setMobileToolsOpen(false)}
          onFiltersChange={updateBoardFilters}
          onFiltersReset={resetBoardFilters}
          onLayoutChange={setBoardLayout}
          onApplySavedView={applySavedView}
          onSaveView={saveCurrentView}
          onDeleteSavedView={removeSavedView}
          onOpenWhiteboard={openWhiteboard}
          onAttachWhiteboard={() => setWhiteboardAttachOpen(true)}
          onCreateWhiteboard={() => setWhiteboardCreateOpen(true)}
          onAddColumn={() => setAddingColumn(true)}
          analyticsHref={`/workspaces/${board.workspaceId}/analytics?boardId=${encodeURIComponent(board.id)}`}
          onOpenActivity={openActivity}
          onOpenMembers={openMembers}
        />
      )}

      <BoardActivityDrawer
        open={isActivityOpen}
        activities={boardActivities.data}
        isLoading={boardActivities.isLoading}
        isError={boardActivities.isError}
        existingTaskIds={existingTaskIds}
        onClose={() => setActivityOpen(false)}
        onOpenTask={handleOpenActivityTask}
      />

      <BoardMembersDrawer
        open={isMembersOpen}
        canManageBoardMembers={canManageBoardMembers}
        currentUserId={currentUser?.id}
        boardMembers={boardMembers.data}
        isBoardMembersLoading={boardMembers.isLoading}
        workspaceTeams={workspaceTeams.data}
        availableWorkspaceMembers={availableWorkspaceMembers}
        shareUserId={shareUserId}
        shareRole={shareRole}
        isShareMembersLoading={isShareMembersLoading}
        isShareMembersError={isShareMembersError}
        isSharePending={shareBoard.isPending}
        isShareError={shareBoard.isError}
        isUpdateMemberRolePending={updateMemberRole.isPending}
        isUpdateMemberRoleError={updateMemberRole.isError}
        isRevokeMemberPending={revokeMember.isPending}
        isRevokeMemberError={revokeMember.isError}
        onClose={() => setMembersOpen(false)}
        onShareUserIdChange={setShareUserId}
        onShareRoleChange={setShareRole}
        onShareBoard={handleShareBoard}
        onUpdateMemberRole={(memberId, role) =>
          updateMemberRole.mutate({ boardId, memberId, role })
        }
        onRevokeMember={(memberId) =>
          revokeMember.mutate({ boardId, memberId })
        }
      />

      {board && (
        <>
          <WhiteboardCreateDialog
            open={isWhiteboardCreateOpen}
            workspaceId={board.workspaceId}
            boards={boards.data}
            defaultBoardId={board.id}
            lockBoard
            onClose={() => setWhiteboardCreateOpen(false)}
            onCreated={(whiteboard) => openWhiteboard(whiteboard.id)}
          />
          <WhiteboardAttachDialog
            open={isWhiteboardAttachOpen}
            workspaceId={board.workspaceId}
            boardId={board.id}
            onClose={() => setWhiteboardAttachOpen(false)}
          />
        </>
      )}

      {effectiveBoard && (
        <TaskDetailModal board={effectiveBoard} onClose={handleCloseTask} />
      )}
    </Box>
  );
};

export default KanbanBoardPage;
