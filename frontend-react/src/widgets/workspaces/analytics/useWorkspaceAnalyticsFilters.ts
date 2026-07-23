'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  analyticsFiltersKey,
  analyticsFiltersToSearchParams,
  createDefaultAnalyticsFilters,
  patchAnalyticsFilters,
  type AnalyticsFilterPatch,
  type AnalyticsFilters,
} from './analytics-filters';

export const useWorkspaceAnalyticsFilters = (
  initialFilters: AnalyticsFilters,
) => {
  const pathname = usePathname();
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [queryFilters, setQueryFilters] = useState(initialFilters);
  const [isTransitionPending, startTransition] = useTransition();
  const initialKey = analyticsFiltersKey(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
    setQueryFilters(initialFilters);
  }, [initialFilters, initialKey]);

  const apply = useCallback(
    (nextFilters: AnalyticsFilters, href: string) => {
      setFilters(nextFilters);
      startTransition(() => {
        setQueryFilters(nextFilters);
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  const update = useCallback(
    (patch: AnalyticsFilterPatch) => {
      const nextFilters = patchAnalyticsFilters(filters, patch);
      const query = analyticsFiltersToSearchParams(nextFilters).toString();
      apply(nextFilters, query ? `${pathname}?${query}` : pathname);
    },
    [apply, filters, pathname],
  );

  const reset = useCallback(() => {
    apply(createDefaultAnalyticsFilters(), pathname);
  }, [apply, pathname]);

  return {
    filters,
    queryFilters,
    update,
    reset,
    isPending:
      isTransitionPending ||
      analyticsFiltersKey(filters) !== analyticsFiltersKey(queryFilters),
  };
};
