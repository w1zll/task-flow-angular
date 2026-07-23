import { act, renderHook } from '@testing-library/react';
import type { AnalyticsFilters } from './analytics-filters';
import { useWorkspaceAnalyticsFilters } from './useWorkspaceAnalyticsFilters';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/workspaces/workspace-1/analytics',
  useRouter: () => ({ replace: mockReplace }),
}));

const initialFilters: AnalyticsFilters = {
  boardId: 'board-1',
  teamId: null,
  assigneeId: null,
  fromDate: '2026-05-01',
  toDate: '2026-07-14',
};

describe('useWorkspaceAnalyticsFilters', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T08:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('starts from server filters and applies changes to query state and URL', () => {
    const { result } = renderHook(() =>
      useWorkspaceAnalyticsFilters(initialFilters),
    );

    expect(result.current.filters).toEqual(initialFilters);
    act(() => result.current.update({ teamId: 'team-1' }));

    expect(result.current.queryFilters.teamId).toBe('team-1');
    expect(mockReplace).toHaveBeenCalledWith(
      '/workspaces/workspace-1/analytics?boardId=board-1&teamId=team-1&fromDate=2026-05-01&toDate=2026-07-14',
      { scroll: false },
    );
  });

  it('resets filters and synchronizes changed server props', () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useWorkspaceAnalyticsFilters(filters),
      { initialProps: { filters: initialFilters } },
    );

    act(() => result.current.reset());
    expect(result.current.filters).toEqual({
      boardId: null,
      teamId: null,
      assigneeId: null,
      fromDate: '2026-04-15',
      toDate: '2026-07-14',
    });
    expect(mockReplace).toHaveBeenLastCalledWith(
      '/workspaces/workspace-1/analytics',
      { scroll: false },
    );

    const restored = { ...initialFilters, boardId: 'board-2' };
    rerender({ filters: restored });
    expect(result.current.filters).toEqual(restored);
    expect(result.current.queryFilters).toEqual(restored);
  });
});
