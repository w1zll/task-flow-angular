import { act } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import WorkspaceAnalyticsPage from './WorkspaceAnalyticsPage';
import type { AnalyticsFilters } from './analytics-filters';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/workspaces/workspace-1/analytics',
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useIsRestoring: () => true,
}));

jest.mock('@/shared/queries/boards.queries', () => ({
  useBoards: () => ({ data: [], isLoading: true }),
}));
jest.mock('@/shared/queries/teams.queries', () => ({
  useWorkspaceTeams: () => ({ data: [], isLoading: true }),
}));
jest.mock('@/shared/queries/workspaces.queries', () => ({
  useWorkspaceMembers: () => ({ data: [], isLoading: true }),
}));
jest.mock('@/shared/queries/workspace-analytics.queries', () => ({
  useWorkspaceAnalyticsDashboard: () => ({
    data: { totals: { completed: 35, open: 90, overdue: 20, total: 125 } },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
}));

jest.mock('./AnalyticsFilterPanel', () => ({
  __esModule: true,
  default: ({ filters }: { filters: AnalyticsFilters }) => (
    <div data-testid="filters">{JSON.stringify(filters)}</div>
  ),
}));
jest.mock('./AnalyticsKpiSummary', () => ({
  __esModule: true,
  default: ({ data, isLoading }: { data?: { totals: { completed: number } }; isLoading: boolean }) => (
    <div>{isLoading ? 'loading-kpis' : (data?.totals.completed ?? 0)}</div>
  ),
}));
jest.mock('./AnalyticsChartGrid', () => ({
  __esModule: true,
  default: () => <div>charts</div>,
}));
jest.mock('./AnalyticsDetailsSection', () => ({
  __esModule: true,
  default: () => <div>details</div>,
}));

describe('WorkspaceAnalyticsPage hydration', () => {
  it('hydrates the server filter snapshot without a mismatch', async () => {
    const initialFilters: AnalyticsFilters = {
      boardId: 'board-1',
      teamId: null,
      assigneeId: null,
      fromDate: '2026-05-01',
      toDate: '2026-07-14',
    };
    const app = (
      <WorkspaceAnalyticsPage
        workspaceId="workspace-1"
        initialFilters={initialFilters}
      />
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    const serverHtml = container.innerHTML;
    expect(container.textContent).toContain('loading-kpis');
    expect(container.textContent).not.toContain('35');
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(container, app);
      await Promise.resolve();
    });

    expect(container.innerHTML).toBe(serverHtml);
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('Hydration failed'),
      ),
    ).toBe(false);

    await act(async () => root?.unmount());
    consoleError.mockRestore();
  });
});
