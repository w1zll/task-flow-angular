import dayjs from 'dayjs';

export const ANALYTICS_DATE_FORMAT = 'YYYY-MM-DD';

export interface AnalyticsFilters {
  boardId: string | null;
  teamId: string | null;
  assigneeId: string | null;
  fromDate: string;
  toDate: string;
}

export type AnalyticsFilterPatch = Partial<AnalyticsFilters>;
export type AnalyticsSearchParams = Record<
  string,
  string | string[] | undefined
>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeId = (value: string | string[] | undefined) => {
  const normalized = firstValue(value)?.trim();
  return normalized ? normalized : null;
};

export const isAnalyticsDate = (value: string | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const createDefaultAnalyticsFilters = (
  now: Date = new Date(),
): AnalyticsFilters => {
  const today = dayjs(now);
  return {
    boardId: null,
    teamId: null,
    assigneeId: null,
    fromDate: today.subtract(90, 'day').format(ANALYTICS_DATE_FORMAT),
    toDate: today.format(ANALYTICS_DATE_FORMAT),
  };
};

export const parseAnalyticsFilters = (
  searchParams: AnalyticsSearchParams,
  now: Date = new Date(),
): AnalyticsFilters => {
  const defaults = createDefaultAnalyticsFilters(now);
  const rawFromDate = firstValue(searchParams.fromDate);
  const rawToDate = firstValue(searchParams.toDate);
  const fromDate = isAnalyticsDate(rawFromDate)
    ? rawFromDate
    : defaults.fromDate;
  const toDate = isAnalyticsDate(rawToDate) ? rawToDate : defaults.toDate;
  const hasValidRange = fromDate <= toDate;

  return {
    boardId: normalizeId(searchParams.boardId),
    teamId: normalizeId(searchParams.teamId),
    assigneeId: normalizeId(searchParams.assigneeId),
    fromDate: hasValidRange ? fromDate : defaults.fromDate,
    toDate: hasValidRange ? toDate : defaults.toDate,
  };
};

export const patchAnalyticsFilters = (
  filters: AnalyticsFilters,
  patch: AnalyticsFilterPatch,
): AnalyticsFilters => ({ ...filters, ...patch });

export const analyticsFiltersToSearchParams = (filters: AnalyticsFilters) => {
  const params = new URLSearchParams();
  (['boardId', 'teamId', 'assigneeId', 'fromDate', 'toDate'] as const).forEach(
    (key) => {
      const value = filters[key];
      if (value) params.set(key, value);
    },
  );
  return params;
};

export const analyticsFiltersKey = (filters: AnalyticsFilters) =>
  JSON.stringify(filters);
