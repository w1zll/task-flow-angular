import { useSnackbar } from 'notistack';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  useBoardViews,
  useCreateBoardView,
  useDeleteBoardView,
} from '@/shared/queries/boards.queries';
import {
  DEFAULT_BOARD_FILTERS,
  boardFiltersFromSavedView,
  boardFiltersToSavedView,
  parseBoardFiltersFromSearchParams,
  writeBoardFiltersToSearchParams,
  type BoardFilters,
} from '../board-filters';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';

export const useBoardFiltersController = (boardId: string) => {
  const t = useTranslations('BoardPage');
  const router = useRouter();
  const isOffline = useIsOffline();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [offlineSearchParamsString, setOfflineSearchParamsString] =
    useState(searchParamsString);
  const effectiveSearchParamsString = isOffline
    ? offlineSearchParamsString
    : searchParamsString;
  const effectiveSearchParams = useMemo(
    () => new URLSearchParams(effectiveSearchParamsString),
    [effectiveSearchParamsString],
  );
  const { enqueueSnackbar } = useSnackbar();
  const [isFilterRefreshVisible, setFilterRefreshVisible] = useState(false);
  const [isFilterNavigationPending, startFilterNavigation] = useTransition();
  const filterRefreshTargetRef = useRef<string | null>(null);
  const filterRefreshTimerRef = useRef<number | null>(null);
  const boardViews = useBoardViews(boardId);
  const createBoardView = useCreateBoardView();
  const deleteBoardView = useDeleteBoardView();
  const selectedViewId = effectiveSearchParams.get('view');
  const taskToHighlightId = effectiveSearchParams.get('taskId');
  const boardFilters = useMemo(
    () =>
      parseBoardFiltersFromSearchParams(
        new URLSearchParams(effectiveSearchParamsString),
      ),
    [effectiveSearchParamsString],
  );

  useEffect(() => {
    if (!isOffline) setOfflineSearchParamsString(searchParamsString);
  }, [isOffline, searchParamsString]);

  const clearFilterRefreshTimer = useCallback(() => {
    if (!filterRefreshTimerRef.current) return;
    window.clearTimeout(filterRefreshTimerRef.current);
    filterRefreshTimerRef.current = null;
  }, []);

  const beginFilterRefresh = useCallback(
    (nextQuery: string) => {
      clearFilterRefreshTimer();
      filterRefreshTargetRef.current = nextQuery;
      setFilterRefreshVisible(true);
      filterRefreshTimerRef.current = window.setTimeout(() => {
        filterRefreshTargetRef.current = null;
        setFilterRefreshVisible(false);
      }, 3000);
    },
    [clearFilterRefreshTimer],
  );

  useEffect(
    () => () => {
      clearFilterRefreshTimer();
    },
    [clearFilterRefreshTimer],
  );

  useEffect(() => {
    if (filterRefreshTargetRef.current !== searchParamsString) return;

    clearFilterRefreshTimer();
    filterRefreshTimerRef.current = window.setTimeout(() => {
      filterRefreshTargetRef.current = null;
      setFilterRefreshVisible(false);
    }, 450);

    return () => {
      clearFilterRefreshTimer();
    };
  }, [clearFilterRefreshTimer, searchParamsString]);

  const replaceBoardFilterUrl = useCallback(
    (nextSearchParams: URLSearchParams) => {
      const nextQuery = nextSearchParams.toString();
      if (nextQuery === effectiveSearchParamsString) return;

      if (isOffline) {
        setOfflineSearchParamsString(nextQuery);
        return;
      }

      beginFilterRefresh(nextQuery);
      startFilterNavigation(() => {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      });
    },
    [
      beginFilterRefresh,
      pathname,
      router,
      effectiveSearchParamsString,
      isOffline,
      startFilterNavigation,
    ],
  );

  const updateBoardFilters = useCallback(
    (filters: BoardFilters) => {
      const nextSearchParams = writeBoardFiltersToSearchParams(
        filters,
        new URLSearchParams(effectiveSearchParamsString),
      );
      nextSearchParams.delete('view');
      replaceBoardFilterUrl(nextSearchParams);
    },
    [effectiveSearchParamsString, replaceBoardFilterUrl],
  );

  const resetBoardFilters = useCallback(() => {
    updateBoardFilters(DEFAULT_BOARD_FILTERS);
  }, [updateBoardFilters]);

  const applySavedView = useCallback(
    (viewId: string | null) => {
      if (!viewId) {
        updateBoardFilters(DEFAULT_BOARD_FILTERS);
        return;
      }

      const view = boardViews.data?.find((item) => item.id === viewId);
      if (!view) return;

      const filters = boardFiltersFromSavedView(view.filters, view.sort);
      const nextSearchParams = writeBoardFiltersToSearchParams(
        filters,
        new URLSearchParams(effectiveSearchParamsString),
      );
      nextSearchParams.set('view', viewId);
      replaceBoardFilterUrl(nextSearchParams);
    },
    [
      boardViews.data,
      replaceBoardFilterUrl,
      effectiveSearchParamsString,
      updateBoardFilters,
    ],
  );

  const saveCurrentView = useCallback(
    (title: string) => {
      const payload = boardFiltersToSavedView(boardFilters);
      createBoardView.mutate(
        {
          boardId,
          data: {
            title,
            filters: payload.filters,
            sort: payload.sort,
          },
        },
        {
          onSuccess: (view) => {
            enqueueSnackbar(t('filters.views.created'), {
              variant: 'success',
            });
            const nextSearchParams = writeBoardFiltersToSearchParams(
              boardFilters,
              new URLSearchParams(effectiveSearchParamsString),
            );
            nextSearchParams.set('view', view.id);
            replaceBoardFilterUrl(nextSearchParams);
          },
          onError: () => {
            enqueueSnackbar(t('filters.views.createError'), {
              variant: 'error',
            });
          },
        },
      );
    },
    [
      boardFilters,
      boardId,
      createBoardView,
      enqueueSnackbar,
      replaceBoardFilterUrl,
      effectiveSearchParamsString,
      t,
    ],
  );

  const removeSavedView = useCallback(
    (viewId: string) => {
      deleteBoardView.mutate(
        { boardId, viewId },
        {
          onSuccess: () => {
            enqueueSnackbar(t('filters.views.deleted'), {
              variant: 'success',
            });
            if (selectedViewId === viewId) {
              updateBoardFilters(DEFAULT_BOARD_FILTERS);
            }
          },
          onError: () => {
            enqueueSnackbar(t('filters.views.deleteError'), {
              variant: 'error',
            });
          },
        },
      );
    },
    [
      boardId,
      deleteBoardView,
      enqueueSnackbar,
      selectedViewId,
      t,
      updateBoardFilters,
    ],
  );

  return {
    boardFilters,
    boardViews,
    selectedViewId,
    taskToHighlightId,
    isFiltering: isFilterRefreshVisible || isFilterNavigationPending,
    createBoardView,
    deleteBoardView,
    updateBoardFilters,
    resetBoardFilters,
    applySavedView,
    saveCurrentView,
    removeSavedView,
  };
};
