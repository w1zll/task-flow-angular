'use client';

import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import type { Board } from '@/shared/api/api';
import {
  syncOfflineDocumentAuthentication,
  syncOfflineDocumentLocale,
  warmOfflineNavigationRoutes,
} from '@/shared/lib/offline-navigation-cache';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { useAuthStore } from '@/shared/store/root.store';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';
import { CloudOffOutlined } from '@mui/icons-material';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import {
  onlineManager,
  type QueryCacheNotifyEvent,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useRef } from 'react';

const shouldWarmNavigationCacheForQueryEvent = (
  event: QueryCacheNotifyEvent,
) => {
  if (event.type !== 'added' && event.type !== 'updated') return false;
  if (event.query.state.status !== 'success') return false;

  const [scope, id, childScope] = event.query.queryKey;

  if (scope === 'workspaces') {
    return typeof id === 'undefined';
  }

  if (scope !== 'boards') return false;

  return typeof id === 'undefined' || typeof childScope === 'undefined';
};

const copy = {
  en: {
    banner:
      'Offline: saved data is shown, and task edits or moves are queued.',
    reconnected: 'Connection restored. Refreshing saved data.',
  },
  ru: {
    banner:
      'Офлайн: показаны сохраненные данные, а изменения задач попадут в очередь.',
    reconnected: 'Соединение восстановлено. Обновляем сохраненные данные.',
  },
};

const OfflineRuntime = () => {
  const locale = useLocale();
  const systemT = useTranslations('SystemStatus');
  const text = locale === 'ru' ? copy.ru : copy.en;
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendAvailabilityStore((state) => state.status);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const wasOnlineRef = useRef(isOnline);
  const isBackendAvailable = isOnline && backendStatus === 'ready';

  useEffect(() => {
    // A cached Next document can contain an older locale. Only an online
    // render is authoritative for the user's latest next-intl cookie choice.
    if (!isOnline) return;
    void syncOfflineDocumentLocale(locale);
  }, [isOnline, locale]);

  useEffect(() => {
    if (isAuthLoading) return;
    void syncOfflineDocumentAuthentication(isAuthenticated);
  }, [isAuthLoading, isAuthenticated]);

  useEffect(() => {
    onlineManager.setOnline(isBackendAvailable);

    if (!wasOnlineRef.current && isOnline) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      enqueueSnackbar(text.reconnected, { variant: 'info' });
    }

    wasOnlineRef.current = isOnline;
  }, [
    enqueueSnackbar,
    isBackendAvailable,
    isOnline,
    queryClient,
    text.reconnected,
  ]);

  useEffect(() => {
    if (!isOnline || typeof window === 'undefined') return;

    let timer: number | null = null;

    const scheduleWarmNavigationCache = () => {
      if (timer) return;

      timer = window.setTimeout(() => {
        timer = null;

        const boards =
          queryClient.getQueryData<Board[]>(queryKeys.boards) ?? [];
        const routes = new Set<string>(['/workspaces']);

        if (window.location.pathname.startsWith('/workspaces')) {
          routes.add(window.location.pathname);
        }

        boards.forEach((board) => {
          const hasBoardDetails =
            queryClient.getQueryState(queryKeys.board(board.id))?.status ===
            'success';

          if (!hasBoardDetails) return;

          routes.add(`/workspaces/${board.workspaceId}`);
          routes.add(`/workspaces/${board.workspaceId}/boards`);
          routes.add(`/workspaces/${board.workspaceId}/boards/${board.id}`);
        });

        if (routes.size) {
          void warmOfflineNavigationRoutes(Array.from(routes));
        }
      }, 1500);
    };

    scheduleWarmNavigationCache();
    const unsubscribe = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (shouldWarmNavigationCacheForQueryEvent(event)) {
          scheduleWarmNavigationCache();
        }
      });

    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, [isOnline, queryClient]);

  if (backendStatus === 'starting') {
    return (
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Alert
          severity="info"
          icon={
            <CircularProgress
              size={20}
              thickness={5}
              color="inherit"
              aria-hidden="true"
            />
          }
          sx={{
            borderRadius: 0,
            alignItems: 'center',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
            {systemT('backendStartingTitle')}
          </Typography>
          <Typography component="p" variant="body2">
            {systemT('backendStartingDescription')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (isOnline) return null;

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Alert
        severity="warning"
        icon={<CloudOffOutlined fontSize="inherit" />}
        sx={{
          borderRadius: 0,
          alignItems: 'center',
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        {text.banner}
      </Alert>
    </Box>
  );
};

export default OfflineRuntime;
