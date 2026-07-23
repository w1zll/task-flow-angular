import { render, screen } from '@testing-library/react';
import BoardPageHeader from './BoardPageHeader';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const board = {
  id: 'board-1',
  title: 'Mobile board',
  ownerId: 'user-1',
  workspaceId: 'workspace-1',
  currentUserRole: 'owner' as const,
  capabilities: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: true,
    canDeleteBoard: true,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: true,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('BoardPageHeader mobile tools', () => {
  it('shows the active filter badge on the tools button', () => {
    render(
      <BoardPageHeader
        board={board}
        isLoading={false}
        canManageColumns
        canEditBoardContent
        isMembersOpen={false}
        isActivityOpen={false}
        activeFilterCount={3}
        onAddColumn={jest.fn()}
        onToggleMembers={jest.fn()}
        onToggleActivity={jest.fn()}
        onOpenMobileTools={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'mobileTools.open' }),
    ).not.toBeNull();
    expect(screen.getByText('3')).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'stats' }).getAttribute('href'),
    ).toBe(
      '/workspaces/workspace-1/analytics?boardId=board-1',
    );
  });
});
