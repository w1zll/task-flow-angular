import {
  analyticsFiltersToSearchParams,
  createDefaultAnalyticsFilters,
  parseAnalyticsFilters,
  patchAnalyticsFilters,
} from './analytics-filters';

const now = new Date('2026-07-14T08:00:00.000Z');

describe('workspace analytics filters', () => {
  it('creates a stable 90-day default range', () => {
    expect(createDefaultAnalyticsFilters(now)).toEqual({
      boardId: null,
      teamId: null,
      assigneeId: null,
      fromDate: '2026-04-15',
      toDate: '2026-07-14',
    });
  });

  it('normalizes valid URL filters', () => {
    expect(
      parseAnalyticsFilters(
        {
          boardId: ' board-1 ',
          teamId: ['team-1', 'ignored'],
          assigneeId: 'user-1',
          fromDate: '2026-05-01',
          toDate: '2026-06-30',
        },
        now,
      ),
    ).toEqual({
      boardId: 'board-1',
      teamId: 'team-1',
      assigneeId: 'user-1',
      fromDate: '2026-05-01',
      toDate: '2026-06-30',
    });
  });

  it('falls back for invalid dates and reversed ranges', () => {
    expect(
      parseAnalyticsFilters(
        { fromDate: '2026-07-31', toDate: '2026-02-31' },
        now,
      ),
    ).toEqual(createDefaultAnalyticsFilters(now));
    expect(
      parseAnalyticsFilters(
        { fromDate: '2026-07-10', toDate: '2026-07-01' },
        now,
      ),
    ).toEqual(createDefaultAnalyticsFilters(now));
  });

  it('patches and serializes applied filters', () => {
    const filters = patchAnalyticsFilters(createDefaultAnalyticsFilters(now), {
      boardId: 'board-1',
      teamId: 'team-1',
    });

    expect(analyticsFiltersToSearchParams(filters).toString()).toBe(
      'boardId=board-1&teamId=team-1&fromDate=2026-04-15&toDate=2026-07-14',
    );
  });
});
