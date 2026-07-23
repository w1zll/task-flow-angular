'use client';

import {
  MATCH_OFFLINE_NAVIGATION_ROUTE,
  OFFLINE_DOCUMENT_AUTHENTICATION_PATH,
  OFFLINE_DOCUMENT_LOCALE_PATH,
  OFFLINE_DOCUMENT_PREFERENCES_CACHE,
  WARM_OFFLINE_NAVIGATION_ROUTES,
  isOfflineNavigationCacheName,
  isUserScopedPwaCacheName,
} from './pwa-cache-names';
import { parseOfflineDocumentLocale } from './offline-document';

export const OFFLINE_ROUTES_WARMED_EVENT = 'taskflow:offline-routes-warmed';

const WORKER_MESSAGE_TIMEOUT_MS = 30_000;
const WORKER_MATCH_TIMEOUT_MS = 3_000;

type OfflineNavigationWorkerResponse = {
  ok?: boolean;
  cached?: boolean;
};

const canUseNavigationCache = () =>
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  'caches' in window;

const writeOfflineDocumentPreference = async (
  path: string,
  value: string,
) => {
  if (
    typeof window === 'undefined' ||
    !('caches' in window) ||
    typeof Response === 'undefined'
  ) {
    return;
  }

  try {
    const cache = await window.caches.open(
      OFFLINE_DOCUMENT_PREFERENCES_CACHE,
    );
    const cacheKey = new URL(path, window.location.origin).toString();
    await cache.put(
      cacheKey,
      new Response(value, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
  } catch {
    // Locale/auth context is a progressive enhancement for the static
    // fallback. Storage quota or private-mode failures must not affect the app.
  }
};

export const syncOfflineDocumentLocale = async (locale: unknown) => {
  const normalizedLocale = parseOfflineDocumentLocale(locale);
  if (!normalizedLocale) return;

  await writeOfflineDocumentPreference(
    OFFLINE_DOCUMENT_LOCALE_PATH,
    normalizedLocale,
  );
};

export const syncOfflineDocumentAuthentication = async (
  isAuthenticated: boolean,
) => {
  await writeOfflineDocumentPreference(
    OFFLINE_DOCUMENT_AUTHENTICATION_PATH,
    isAuthenticated ? '1' : '0',
  );
};

const normalizeNavigationRoute = (route: string) => {
  try {
    const url = new URL(route, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    if (!url.pathname.startsWith('/workspaces')) return undefined;

    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
};

const getActiveServiceWorker = async () => {
  const serviceWorker = navigator.serviceWorker;
  if (serviceWorker.controller) return serviceWorker.controller;

  try {
    const registration = await serviceWorker.getRegistration();
    return registration?.active ?? null;
  } catch {
    return null;
  }
};

const postServiceWorkerRequest = async (
  message: unknown,
  timeoutMs: number,
): Promise<OfflineNavigationWorkerResponse | undefined> => {
  if (!canUseNavigationCache() || typeof MessageChannel === 'undefined') {
    return undefined;
  }

  const worker = await getActiveServiceWorker();
  if (!worker) return undefined;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const finish = (response?: OfflineNavigationWorkerResponse) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      channel.port1.close();
      resolve(response);
    };

    const timeoutId = window.setTimeout(() => finish(), timeoutMs);
    channel.port1.onmessage = (event) => finish(event.data);
    channel.port1.onmessageerror = () => finish();

    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      finish();
    }
  });
};

const matchLegacyNavigationCache = async (route: string) => {
  try {
    const pathname = new URL(route, window.location.origin).pathname;
    const cacheNames = await window.caches.keys();

    for (const cacheName of cacheNames) {
      if (!isOfflineNavigationCacheName(cacheName)) continue;
      const cache = await window.caches.open(cacheName);
      if (await cache.match(route)) return true;
      if (await cache.match(pathname)) return true;
    }
  } catch {
    // Cache inspection is best-effort for uncontrolled legacy pages.
  }

  return false;
};

export const warmOfflineNavigationRoutes = async (routes: string[]) => {
  if (!canUseNavigationCache()) return;

  const normalizedRoutes = Array.from(
    new Set(routes.map(normalizeNavigationRoute).filter(Boolean)),
  ) as string[];
  if (!normalizedRoutes.length) return;

  await postServiceWorkerRequest(
    {
      type: WARM_OFFLINE_NAVIGATION_ROUTES,
      routes: normalizedRoutes,
    },
    WORKER_MESSAGE_TIMEOUT_MS,
  );

  window.dispatchEvent(new Event(OFFLINE_ROUTES_WARMED_EVENT));
};

export const hasCachedOfflineNavigationRoute = async (route: string) => {
  if (!canUseNavigationCache()) return false;

  const normalizedRoute = normalizeNavigationRoute(route);
  if (!normalizedRoute) return false;

  const hasControllingWorker = Boolean(navigator.serviceWorker.controller);
  const response = await postServiceWorkerRequest(
    {
      type: MATCH_OFFLINE_NAVIGATION_ROUTE,
      route: normalizedRoute,
    },
    WORKER_MATCH_TIMEOUT_MS,
  );

  if (typeof response?.cached === 'boolean') return response.cached;

  // Once a page is controlled, only the active worker knows which
  // build-specific HTML cache is safe to execute with its precached chunks.
  if (hasControllingWorker) return false;

  return matchLegacyNavigationCache(normalizedRoute);
};

export const clearOfflineApplicationCaches = async () => {
  if (!canUseNavigationCache()) return;

  try {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter(isUserScopedPwaCacheName)
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  } catch {
    // Cache cleanup is best-effort. Auth and query state are cleared separately.
  }
};
