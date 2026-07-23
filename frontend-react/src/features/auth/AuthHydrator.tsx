'use client';

import { authApi } from '@/shared/api/api';
import { readStoredAuthUser, writeStoredAuthUser } from '@/shared/lib/auth-session';
import {
  isBrowserOffline,
  markNetworkOffline,
} from '@/shared/lib/offline';
import { useAuthStore } from '@/shared/store/root.store';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const STARTUP_AUTH_TIMEOUT_MS = 5000;

const hasHttpResponse = (error: unknown) =>
  Boolean((error as { response?: unknown } | null)?.response);

const isOfflineProbeResponse = (error: unknown) => {
  const response = (
    error as {
      response?: {
        headers?: { get?: (name: string) => unknown };
      };
    } | null
  )?.response;

  return response?.headers?.get?.('x-taskflow-offline-miss') === '1';
};

const isAnonymousAuthRoute = (pathname: string) =>
  pathname === '/auth' ||
  pathname === '/auth/login' ||
  pathname === '/auth/register';

const AuthHydrator = () => {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  const backendStatus = useBackendAvailabilityStore((state) => state.status);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    let cancelled = false;
    let authController: AbortController | null = null;
    let authTimeoutId: number | null = null;

    if (isAnonymousAuthRoute(pathname)) {
      hydrate(null);
      return;
    }

    if (pathname === '/auth/oauth/callback') return;

    if (!isLoading) return;

    const hydrateFromCache = () => {
      hydrate(readStoredAuthUser());
    };

    if (!isOnline) {
      hydrateFromCache();
      return;
    }

    if (backendStatus !== 'ready') return;

    const loadAuthUser = async () => {
      if (isBrowserOffline()) {
        hydrateFromCache();
        return;
      }

      try {
        authController = new AbortController();
        authTimeoutId = window.setTimeout(
          () => authController?.abort(),
          STARTUP_AUTH_TIMEOUT_MS,
        );
        const res = await authApi.me({
          signal: authController.signal,
          timeout: STARTUP_AUTH_TIMEOUT_MS,
        });
        if (cancelled) return;
        writeStoredAuthUser(res.data);
        hydrate(res.data);
      } catch (error) {
        if (cancelled) return;

        const isOfflineFailure =
          !hasHttpResponse(error) || isOfflineProbeResponse(error);

        if (isOfflineFailure) {
          markNetworkOffline();
        }

        if (isBrowserOffline() || isOfflineFailure) {
          hydrateFromCache();
          return;
        }

        hydrate(null);
      } finally {
        if (authTimeoutId !== null) {
          window.clearTimeout(authTimeoutId);
        }
      }
    };

    void loadAuthUser();

    return () => {
      cancelled = true;
      authController?.abort();
      if (authTimeoutId !== null) {
        window.clearTimeout(authTimeoutId);
      }
    };
  }, [backendStatus, hydrate, isLoading, isOnline, pathname]);

  return null;
};

export default AuthHydrator;
