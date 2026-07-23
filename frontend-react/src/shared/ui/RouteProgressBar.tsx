'use client';

import { Box, LinearProgress } from '@mui/material';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { usePathname, useSearchParams } from 'next/navigation';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 220;
const MAX_VISIBLE_MS = 10000;

const isModifiedClick = (event: MouseEvent) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

const shouldTrackAnchor = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) return false;

  const currentUrl = new URL(window.location.href);
  return (
    nextUrl.pathname !== currentUrl.pathname ||
    nextUrl.search !== currentUrl.search
  );
};

const clearTimer = (timerRef: MutableRefObject<number | undefined>) => {
  if (timerRef.current === undefined) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = undefined;
};

const RouteProgressBar = () => {
  const isOffline = useIsOffline();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = `${pathname}?${searchParams.toString()}`;
  const [isVisible, setVisible] = useState(false);
  const startedAtRef = useRef(0);
  const routeRef = useRef(route);
  const fallbackTimerRef = useRef<number | undefined>(undefined);
  const finishTimerRef = useRef<number | undefined>(undefined);

  const finish = useCallback(() => {
    clearTimer(fallbackTimerRef);

    const elapsed = Date.now() - startedAtRef.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    clearTimer(finishTimerRef);
    finishTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      finishTimerRef.current = undefined;
    }, delay);
  }, []);

  const start = useCallback(() => {
    clearTimer(finishTimerRef);
    clearTimer(fallbackTimerRef);

    startedAtRef.current = Date.now();
    setVisible(true);
    fallbackTimerRef.current = window.setTimeout(finish, MAX_VISIBLE_MS);
  }, [finish]);

  useEffect(() => {
    if (routeRef.current === route) return;

    routeRef.current = route;
    if (isVisible) finish();
  }, [finish, isVisible, route]);

  useEffect(() => {
    if (isOffline && isVisible) finish();
  }, [finish, isOffline, isVisible]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isOffline) return;
      if (event.defaultPrevented || isModifiedClick(event)) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (shouldTrackAnchor(anchor)) start();
    };

    const handlePopState = () => {
      if (!isOffline) start();
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      clearTimer(fallbackTimerRef);
      clearTimer(finishTimerRef);
    };
  }, [isOffline, start]);

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        top: { xs: 56, sm: 64 },
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: 3,
        pointerEvents: 'none',
      }}
    >
      {isVisible && (
        <LinearProgress
          sx={{
            height: 3,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'primary.main',
            },
          }}
        />
      )}
    </Box>
  );
};

export default RouteProgressBar;
