'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  DEFAULT_BOARD_LAYOUT,
  parseBoardLayoutFromSearchParams,
  writeBoardLayoutToSearchParams,
  type BoardLayout,
} from '../board-layout';

export const useBoardLayoutController = () => {
  const router = useRouter();
  const isOffline = useIsOffline();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const urlBoardLayout = useMemo(
    () => parseBoardLayoutFromSearchParams(new URLSearchParams(searchParamsString)),
    [searchParamsString],
  );
  const [offlineBoardLayout, setOfflineBoardLayout] =
    useState<BoardLayout>(urlBoardLayout);
  const boardLayout = isOffline ? offlineBoardLayout : urlBoardLayout;

  useEffect(() => {
    if (!isOffline) setOfflineBoardLayout(urlBoardLayout);
  }, [isOffline, urlBoardLayout]);

  const replaceBoardLayoutUrl = useCallback(
    (layout: BoardLayout) => {
      if (isOffline) {
        setOfflineBoardLayout(layout);
        return;
      }

      const nextSearchParams = writeBoardLayoutToSearchParams(
        layout,
        new URLSearchParams(searchParamsString),
      );
      const nextQuery = nextSearchParams.toString();
      const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      if (nextQuery === searchParamsString) return;

      router.replace(nextPath, { scroll: false });
    },
    [isOffline, pathname, router, searchParamsString],
  );

  return {
    boardLayout,
    defaultBoardLayout: DEFAULT_BOARD_LAYOUT,
    setBoardLayout: replaceBoardLayoutUrl,
  };
};
