'use client';

import type { Board } from '@/shared/api/api';
import {
  OFFLINE_ROUTES_WARMED_EVENT,
  hasCachedOfflineNavigationRoute,
} from '@/shared/lib/offline-navigation-cache';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

const isBoardDetailQueryKey = (
  queryKey: readonly unknown[],
): queryKey is ReturnType<typeof queryKeys.board> =>
  queryKey.length === 2 &&
  queryKey[0] === queryKeys.boards[0] &&
  typeof queryKey[1] === 'string';

const collectCachedBoardDetails = (queryClient: QueryClient) => {
  const boards: Board[] = [];

  queryClient
    .getQueryCache()
    .findAll()
    .forEach((query) => {
      if (
        isBoardDetailQueryKey(query.queryKey) &&
        query.state.status === 'success' &&
        query.state.data
      ) {
        boards.push(query.state.data as Board);
      }
    });

  return boards;
};

const collectCachedBoardDetailIds = (queryClient: QueryClient) =>
  new Set(collectCachedBoardDetails(queryClient).map((board) => board.id));

const canTrustBoardDetailCacheOnly = () =>
  typeof navigator === 'undefined' ||
  !('serviceWorker' in navigator) ||
  !navigator.serviceWorker.controller;

const collectOfflineAvailableBoardIds = async (queryClient: QueryClient) => {
  const boards = collectCachedBoardDetails(queryClient);

  if (canTrustBoardDetailCacheOnly()) {
    return new Set(boards.map((board) => board.id));
  }

  const availableBoardIds = new Set<string>();

  await Promise.all(
    boards.map(async (board) => {
      const route = `/workspaces/${board.workspaceId}/boards/${board.id}`;
      const isCurrentRoute =
        typeof window !== 'undefined' && window.location.pathname === route;

      if (isCurrentRoute || (await hasCachedOfflineNavigationRoute(route))) {
        availableBoardIds.add(board.id);
      }
    }),
  );

  return availableBoardIds;
};

const areSetsEqual = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  left.size === right.size && Array.from(left).every((item) => right.has(item));

export const useCachedBoardDetailIds = () => {
  const queryClient = useQueryClient();
  const syncVersionRef = useRef(0);
  const [cachedBoardIds, setCachedBoardIds] = useState<Set<string>>(() =>
    collectCachedBoardDetailIds(queryClient),
  );

  useEffect(() => {
    let isActive = true;
    let syncTimeoutId: number | null = null;

    const setNextCachedBoardIds = (nextBoardIds: Set<string>) => {
      setCachedBoardIds((previousBoardIds) =>
        areSetsEqual(previousBoardIds, nextBoardIds)
          ? previousBoardIds
          : nextBoardIds,
      );
    };

    const syncCachedBoardIds = () => {
      const syncVersion = ++syncVersionRef.current;
      const fallbackBoardIds = collectCachedBoardDetailIds(queryClient);

      setNextCachedBoardIds(fallbackBoardIds);

      void collectOfflineAvailableBoardIds(queryClient).then(
        (nextBoardIds) => {
          if (!isActive || syncVersion !== syncVersionRef.current) return;

          setNextCachedBoardIds(nextBoardIds);
        },
      );
    };

    const scheduleCachedBoardIdsSync = () => {
      if (syncTimeoutId !== null) return;

      syncTimeoutId = window.setTimeout(() => {
        syncTimeoutId = null;
        if (!isActive) return;

        syncCachedBoardIds();
      }, 0);
    };

    scheduleCachedBoardIdsSync();
    const unsubscribe = queryClient
      .getQueryCache()
      .subscribe(scheduleCachedBoardIdsSync);
    window.addEventListener(
      OFFLINE_ROUTES_WARMED_EVENT,
      scheduleCachedBoardIdsSync,
    );

    return () => {
      isActive = false;
      syncVersionRef.current += 1;
      if (syncTimeoutId !== null) {
        window.clearTimeout(syncTimeoutId);
      }
      unsubscribe();
      window.removeEventListener(
        OFFLINE_ROUTES_WARMED_EVENT,
        scheduleCachedBoardIdsSync,
      );
    };
  }, [queryClient]);

  return cachedBoardIds;
};
