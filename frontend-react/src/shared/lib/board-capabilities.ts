import type { Board } from '@/shared/api/api';

export type BoardCapabilities = Board['capabilities'];

type BoardCapabilitySource = {
  currentUserRole?: Board['currentUserRole'];
  capabilities?: Partial<BoardCapabilities> | null;
};

const VIEWER_CAPABILITIES: BoardCapabilities = {
  canReadBoard: true,
  canEditBoardContent: false,
  canManageBoardMembers: false,
  canDeleteBoard: false,
  canManageColumns: false,
  canUseWhiteboard: false,
  canManageBoardSettings: false,
};

const CAPABILITIES_BY_ROLE: Record<
  Board['currentUserRole'],
  BoardCapabilities
> = {
  owner: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: true,
    canDeleteBoard: true,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: true,
  },
  editor: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: false,
    canDeleteBoard: false,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: false,
  },
  viewer: VIEWER_CAPABILITIES,
};

const isBoardRecord = (value: unknown): value is Board =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { id?: unknown }).id === 'string' &&
      typeof (value as { workspaceId?: unknown }).workspaceId === 'string',
  );

export const getBoardCapabilities = (
  board?: BoardCapabilitySource | null,
): BoardCapabilities => ({
  ...(board?.currentUserRole
    ? CAPABILITIES_BY_ROLE[board.currentUserRole]
    : VIEWER_CAPABILITIES),
  ...(board?.capabilities ?? {}),
});

export const normalizeBoard = (board: Board): Board =>
  isBoardRecord(board)
    ? {
        ...board,
        capabilities: getBoardCapabilities(board),
      }
    : board;

export const normalizeBoards = (boards: Board[]): Board[] =>
  Array.isArray(boards)
    ? boards.filter(isBoardRecord).map(normalizeBoard)
    : [];
