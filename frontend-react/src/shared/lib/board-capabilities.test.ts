import type { Board } from '@/shared/api/api';
import { getBoardCapabilities, normalizeBoard } from './board-capabilities';

describe('board capabilities compatibility', () => {
  it('reconstructs capabilities for an old persisted board', () => {
    const oldBoard = {
      id: 'board-1',
      workspaceId: 'workspace-1',
      currentUserRole: 'editor',
    } as Board;

    const normalized = normalizeBoard(oldBoard);

    expect(normalized.capabilities).toMatchObject({
      canReadBoard: true,
      canEditBoardContent: true,
      canManageColumns: true,
      canManageBoardMembers: false,
    });
  });

  it('defaults unknown legacy data to read-only capabilities', () => {
    expect(getBoardCapabilities()).toEqual({
      canReadBoard: true,
      canEditBoardContent: false,
      canManageBoardMembers: false,
      canDeleteBoard: false,
      canManageColumns: false,
      canUseWhiteboard: false,
      canManageBoardSettings: false,
    });
  });
});
