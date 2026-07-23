import { render, screen } from '@testing-library/react';
import AnalyticsFilterPanel from './AnalyticsFilterPanel';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('AnalyticsFilterPanel', () => {
  it('shows the selected assignee avatar', () => {
    render(
      <AnalyticsFilterPanel
        filters={{
          boardId: null,
          teamId: null,
          assigneeId: 'user-1',
          fromDate: '2026-04-15',
          toDate: '2026-07-14',
        }}
        boards={[]}
        teams={[]}
        members={[
          {
            userId: 'user-1',
            user: {
              name: 'Alex Morgan',
              avatar: 'https://example.com/alex.png',
            },
          },
        ]}
        isBoardsLoading={false}
        isTeamsLoading={false}
        isMembersLoading={false}
        isRefreshing={false}
        onUpdate={jest.fn()}
        onReset={jest.fn()}
      />,
    );

    expect(screen.getByAltText('Alex Morgan')).not.toBeNull();
    expect(screen.getByText('Alex Morgan')).not.toBeNull();
  });
});
