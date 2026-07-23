'use client';

import { markNetworkOffline, markNetworkOnline } from '@/shared/lib/offline';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useRef } from 'react';

const START_NOTICE_DELAY_MS = 1_500;
const PROBE_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 2_500;

const isOfflineResponse = (response: Response) =>
  response.headers.get('x-taskflow-offline-miss') === '1';

const BackendWakeupRuntime = () => {
  const t = useTranslations('SystemStatus');
  const backendReadyMessage = t('backendReady');
  const setBackendStatus = useBackendAvailabilityStore(
    (state) => state.setStatus,
  );
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const noticeWasShownRef = useRef(false);
  const notificationRef = useRef({ backendReadyMessage, enqueueSnackbar });

  useEffect(() => {
    notificationRef.current = { backendReadyMessage, enqueueSnackbar };
  }, [backendReadyMessage, enqueueSnackbar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    let controller: AbortController | null = null;
    let noticeTimer: number | null = null;
    let timeoutTimer: number | null = null;
    let retryTimer: number | null = null;

    const clearTimers = () => {
      if (noticeTimer !== null) window.clearTimeout(noticeTimer);
      if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      noticeTimer = null;
      timeoutTimer = null;
      retryTimer = null;
    };

    const cancelStartingNotice = () => {
      if (noticeTimer !== null) {
        window.clearTimeout(noticeTimer);
        noticeTimer = null;
      }
    };

    const scheduleRetry = (probe: () => void) => {
      if (!active || retryTimer !== null) return;

      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        probe();
      }, RETRY_DELAY_MS);
    };

    const probeBackend = () => {
      if (!active || controller) return;

      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }

      if (!navigator.onLine) {
        cancelStartingNotice();
        setBackendStatus('checking');
        markNetworkOffline();
        return;
      }

      controller = new AbortController();
      const probeController = controller;

      noticeTimer = window.setTimeout(() => {
        if (!active || controller !== probeController) return;
        noticeWasShownRef.current = true;
        setBackendStatus('starting');
      }, START_NOTICE_DELAY_MS);

      timeoutTimer = window.setTimeout(
        () => probeController.abort(),
        PROBE_TIMEOUT_MS,
      );

      void fetch('/api/health', {
        cache: 'no-store',
        credentials: 'omit',
        signal: probeController.signal,
      })
        .then((response) => {
          if (!active || controller !== probeController) return;

          if (!navigator.onLine || isOfflineResponse(response)) {
            cancelStartingNotice();
            setBackendStatus('checking');
            markNetworkOffline();
            return;
          }

          if (!response.ok) {
            throw new Error(`Backend health check failed: ${response.status}`);
          }

          cancelStartingNotice();
          markNetworkOnline();
          setBackendStatus('ready');
          void queryClient.invalidateQueries({ refetchType: 'active' });

          if (noticeWasShownRef.current) {
            const notification = notificationRef.current;
            notification.enqueueSnackbar(notification.backendReadyMessage, {
              variant: 'success',
            });
            noticeWasShownRef.current = false;
          }
        })
        .catch(() => {
          if (!active || controller !== probeController) return;

          if (!navigator.onLine) {
            cancelStartingNotice();
            setBackendStatus('checking');
            markNetworkOffline();
            return;
          }

          noticeWasShownRef.current = true;
          setBackendStatus('starting');
          scheduleRetry(probeBackend);
        })
        .finally(() => {
          if (controller !== probeController) return;
          if (timeoutTimer !== null) {
            window.clearTimeout(timeoutTimer);
            timeoutTimer = null;
          }
          controller = null;
        });
    };

    const handleOnline = () => {
      probeBackend();
    };

    const handleOffline = () => {
      controller?.abort();
      controller = null;
      clearTimers();
      setBackendStatus('checking');
      markNetworkOffline();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') probeBackend();
    };

    probeBackend();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', probeBackend);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', probeBackend);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controller?.abort();
      clearTimers();
    };
  }, [queryClient, setBackendStatus]);

  return null;
};

export default BackendWakeupRuntime;
