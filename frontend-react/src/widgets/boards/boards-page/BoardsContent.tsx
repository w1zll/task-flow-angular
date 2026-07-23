'use client';

import type { Board } from '@/shared/api/api';
import { Grid, Stack } from '@mui/material';
import BoardCard from './BoardCard';
import BoardsEmptyState from './BoardsEmptyState';
import BoardsLoadingGrid from './BoardsLoadingGrid';
import type { WorkspaceBoardGroup } from './types';
import WorkspaceBoardGroupCard from './WorkspaceBoardGroupCard';

interface BoardsContentProps {
  isLoading: boolean;
  isWorkspaceMode: boolean;
  visibleBoards: Board[];
  groupedBoards: WorkspaceBoardGroup[];
  onCreateBoard: (workspaceId?: string) => void;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onOpenBoardMenu: (anchor: HTMLElement, board: Board) => void;
  canMutate?: boolean;
  isOffline?: boolean;
  cachedBoardIds?: ReadonlySet<string>;
  onOpenUnavailableBoard?: (board: Board) => void;
  onOpenUnavailableWorkspace?: (
    workspace: WorkspaceBoardGroup['workspace'],
  ) => void;
}

const BoardsContent = ({
  isLoading,
  isWorkspaceMode,
  visibleBoards,
  groupedBoards,
  onCreateBoard,
  onCreateWorkspace,
  onDeleteWorkspace,
  onOpenBoardMenu,
  canMutate = true,
  isOffline = false,
  cachedBoardIds,
  onOpenUnavailableBoard,
  onOpenUnavailableWorkspace,
}: BoardsContentProps) => {
  if (isLoading) {
    return <BoardsLoadingGrid />;
  }

  if (isWorkspaceMode) {
    return visibleBoards.length ? (
      <Grid container spacing={2}>
        {visibleBoards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onOpenMenu={onOpenBoardMenu}
            canOpenMenu={canMutate}
            isOffline={isOffline}
            isOfflineUnavailable={
              isOffline && !cachedBoardIds?.has(board.id)
            }
            onOfflineUnavailable={onOpenUnavailableBoard}
          />
        ))}
      </Grid>
    ) : (
      <BoardsEmptyState
        titleKey="emptyWorkspaceTitle"
        actionKey="emptyAction"
        onAction={() => onCreateBoard()}
        disabled={!canMutate}
      />
    );
  }

  return groupedBoards.length ? (
    <Stack spacing={2.5}>
      {groupedBoards.map((group) => (
        <WorkspaceBoardGroupCard
          key={group.workspace.id}
          workspace={group.workspace}
          boards={group.boards}
          onCreateBoard={onCreateBoard}
          onDeleteWorkspace={onDeleteWorkspace}
          onOpenBoardMenu={onOpenBoardMenu}
          canMutate={canMutate}
          isOffline={isOffline}
          cachedBoardIds={cachedBoardIds}
          onOpenUnavailableBoard={onOpenUnavailableBoard}
          onOpenUnavailableWorkspace={onOpenUnavailableWorkspace}
        />
      ))}
    </Stack>
  ) : (
    <BoardsEmptyState
      titleKey="emptyTitle"
      actionKey="newWorkspace"
      onAction={onCreateWorkspace}
      disabled={!canMutate}
    />
  );
};

export default BoardsContent;
