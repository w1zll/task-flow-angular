import {
  BoardMember,
  WorkspaceMember,
} from '@/shared/api/api';
import { getAvailableWorkspaceMembers } from './board-members';

describe('getAvailableWorkspaceMembers', () => {
  it('returns only workspace members without board access', () => {
    const workspaceMembers = [
      { userId: 'owner-1' },
      { userId: 'editor-1' },
      { userId: 'candidate-1' },
    ] as WorkspaceMember[];
    const boardMembers = [
      { userId: 'owner-1', role: 'owner' },
      { userId: 'editor-1', role: 'editor' },
    ] as BoardMember[];

    expect(
      getAvailableWorkspaceMembers(workspaceMembers, boardMembers),
    ).toEqual([{ userId: 'candidate-1' }]);
  });

  it('returns an empty list while workspace members are unavailable', () => {
    expect(getAvailableWorkspaceMembers(undefined, undefined)).toEqual([]);
  });
});
