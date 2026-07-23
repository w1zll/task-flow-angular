import {
  defaultCache,
  PAGES_CACHE_NAME,
} from '@serwist/next/worker';
import {
  MATCH_OFFLINE_NAVIGATION_ROUTE,
  OFFLINE_DOCUMENT_AUTHENTICATION_PATH,
  OFFLINE_DOCUMENT_LOCALE_PATH,
  OFFLINE_DOCUMENT_PREFERENCES_CACHE,
  WARM_OFFLINE_NAVIGATION_ROUTES,
  getOfflineNavigationCacheName,
  isOfflineNavigationCacheName,
  isUserScopedPwaCacheName,
} from '@/shared/lib/pwa-cache-names';
import {
  DEFAULT_OFFLINE_DOCUMENT_LOCALE,
  createOfflineDocumentHtml,
  getOfflineLocaleFromAcceptLanguage,
  getOfflineLocaleFromCookieHeader,
  getOfflineLocaleFromHtml,
  parseOfflineDocumentLocale,
} from '@/shared/lib/offline-document';
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
  SerwistPlugin,
} from 'serwist';
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const NETWORK_TIMEOUT_MS = 10_000;
const STATIC_IMAGE_CACHE = 'static-image-assets';
const PRECACHE_ENTRIES = self.__SW_MANIFEST ?? [];
const NEXT_BUILD_MANIFEST_PATTERN =
  /\/_next\/static\/([^/]+)\/_buildManifest\.js(?:\?|$)/;
const NEXT_BUILD_ID = PRECACHE_ENTRIES.map((entry) =>
  (typeof entry === 'string' ? entry : entry.url).replaceAll('\\', '/'),
)
  .map((url) => url.match(NEXT_BUILD_MANIFEST_PATTERN)?.[1])
  .find((buildId): buildId is string => Boolean(buildId));
const OFFLINE_NAVIGATION_CACHE = getOfflineNavigationCacheName(
  NEXT_BUILD_ID ?? 'unavailable',
);
const RSC_CACHE_VERSION = NEXT_BUILD_ID ?? 'unavailable';
const RSC_CACHE_NAME = `taskflow-pwa-pages-rsc-${RSC_CACHE_VERSION}`;
const RSC_PREFETCH_CACHE_NAME =
  `taskflow-pwa-pages-rsc-prefetch-${RSC_CACHE_VERSION}`;
const CURRENT_USER_SCOPED_CACHE_NAMES = new Set([
  OFFLINE_NAVIGATION_CACHE,
  RSC_CACHE_NAME,
  RSC_PREFETCH_CACHE_NAME,
]);
const fetchWithTimeout = async (
  request: Request,
  timeoutMs = NETWORK_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const createOfflineAuthProbeResponse = () =>
  new Response(JSON.stringify({ message: 'Offline' }), {
    status: 503,
    statusText: 'Offline',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-TaskFlow-Offline-Miss': '1',
    },
  });

const createOfflineMissResponse = (contentType: string) =>
  new Response('', {
    status: 503,
    statusText: 'Offline',
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-TaskFlow-Offline-Miss': '1',
    },
  });

const getPathname = (input: Request | string) =>
  new URL(typeof input === 'string' ? input : input.url, self.location.origin)
    .pathname;

const getNavigationPath = (input: Request | string) => {
  const url = new URL(
    typeof input === 'string' ? input : input.url,
    self.location.origin,
  );
  return `${url.pathname}${url.search}`;
};

const normalizeWorkspaceNavigationPath = (input: unknown) => {
  if (typeof input !== 'string') return undefined;

  try {
    const url = new URL(input, self.location.origin);
    if (url.origin !== self.location.origin) return undefined;
    if (!url.pathname.startsWith('/workspaces')) return undefined;
    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
};

const getNavigationCacheKeys = (input: Request | string) => {
  const url = new URL(
    typeof input === 'string' ? input : input.url,
    self.location.origin,
  );
  url.hash = '';

  const keys = new Set<string>([
    url.toString(),
    `${url.pathname}${url.search}`,
    url.pathname,
  ]);
  const alternatePathname =
    url.pathname === '/'
      ? undefined
      : url.pathname.endsWith('/')
        ? url.pathname.slice(0, -1)
        : `${url.pathname}/`;

  if (alternatePathname) {
    const alternateUrl = new URL(url.toString());
    alternateUrl.pathname = alternatePathname;
    keys.add(alternateUrl.toString());
    keys.add(`${alternatePathname}${url.search}`);
    keys.add(alternatePathname);
  }

  return Array.from(keys);
};

const matchCachedNavigation = async (
  cache: Cache,
  input: Request | string,
) => {
  for (const key of getNavigationCacheKeys(input)) {
    const response = await cache.match(key);
    if (response) return response;
  }

  return undefined;
};

const getOfflineDocumentPreferenceKey = (path: string) =>
  new URL(path, self.location.origin).toString();

const readOfflineDocumentPreference = async (path: string) => {
  try {
    const cache = await caches.open(OFFLINE_DOCUMENT_PREFERENCES_CACHE);
    const response = await cache.match(getOfflineDocumentPreferenceKey(path));
    return response ? await response.text() : undefined;
  } catch {
    return undefined;
  }
};

const writeOfflineDocumentPreference = async (
  path: string,
  value: string,
) => {
  try {
    const cache = await caches.open(OFFLINE_DOCUMENT_PREFERENCES_CACHE);
    await cache.put(
      getOfflineDocumentPreferenceKey(path),
      new Response(value, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      }),
    );
  } catch {
    // The generic fallback must still render if persistent storage is full or
    // unavailable (for example, in a constrained/private browser context).
  }
};

const persistOfflineDocumentLocale = (locale: 'en' | 'ru') =>
  writeOfflineDocumentPreference(OFFLINE_DOCUMENT_LOCALE_PATH, locale);

const persistOfflineDocumentAuthentication = (isAuthenticated: boolean) =>
  writeOfflineDocumentPreference(
    OFFLINE_DOCUMENT_AUTHENTICATION_PATH,
    isAuthenticated ? '1' : '0',
  );

const resolveOfflineDocumentLocale = async (request: Request) => {
  const cookieLocale = getOfflineLocaleFromCookieHeader(
    request.headers.get('cookie') ?? '',
  );
  if (cookieLocale) {
    await persistOfflineDocumentLocale(cookieLocale);
    return cookieLocale;
  }

  const storedLocale = parseOfflineDocumentLocale(
    await readOfflineDocumentPreference(OFFLINE_DOCUMENT_LOCALE_PATH),
  );
  if (storedLocale) return storedLocale;

  return (
    getOfflineLocaleFromAcceptLanguage(
      request.headers.get('accept-language') ?? '',
    ) ??
    getOfflineLocaleFromAcceptLanguage(self.navigator.language ?? '') ??
    DEFAULT_OFFLINE_DOCUMENT_LOCALE
  );
};

const createOfflineDocumentResponse = async (
  request: Request,
  navigationCache: Cache,
) => {
  const [locale, authentication, cachedWorkspaces] = await Promise.all([
    resolveOfflineDocumentLocale(request),
    readOfflineDocumentPreference(OFFLINE_DOCUMENT_AUTHENTICATION_PATH),
    matchCachedNavigation(navigationCache, '/workspaces'),
  ]);
  const showWorkspacesLink =
    authentication === '1' && Boolean(cachedWorkspaces);

  return new Response(
    createOfflineDocumentHtml({ locale, showWorkspacesLink }),
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Language': locale,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
};

const isCacheableNavigationResponse = (
  response: Response,
  expectedPathname: string,
) => {
  if (!response.ok || response.redirected) return false;
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return false;
  }

  try {
    const responseUrl = new URL(response.url);
    return (
      responseUrl.origin === self.location.origin &&
      responseUrl.pathname === expectedPathname
    );
  } catch {
    return false;
  }
};

const containsCurrentNextBuild = (payload: string) => {
  if (!NEXT_BUILD_ID) return false;

  return (
    payload.includes(`"b":"${NEXT_BUILD_ID}"`) ||
    payload.includes(`\\"b\\":\\"${NEXT_BUILD_ID}\\"`) ||
    payload.includes(`/_next/static/${NEXT_BUILD_ID}/`)
  );
};

const bufferCompatibleNavigationResponse = async (response: Response) => {
  const snapshot = response.clone();
  const body = await response.arrayBuffer();
  const html = new TextDecoder().decode(body);
  if (!containsCurrentNextBuild(html)) return undefined;

  const documentLocale = getOfflineLocaleFromHtml(html);
  await Promise.all([
    documentLocale
      ? persistOfflineDocumentLocale(documentLocale)
      : Promise.resolve(),
    persistOfflineDocumentAuthentication(true),
  ]);

  return snapshot;
};

const currentBuildRscCachePlugin: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => {
    if (!response.ok) return null;
    if (
      !response.headers
        .get('content-type')
        ?.includes('text/x-component')
    ) {
      return null;
    }

    try {
      const payload = await response.clone().text();
      return containsCurrentNextBuild(payload) ? response : null;
    } catch {
      return null;
    }
  },
};

const getPreviouslyCachedWorkspacePaths = async () => {
  const paths = new Set<string>();
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    if (!isOfflineNavigationCacheName(cacheName)) continue;

    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    requests.forEach((request) => {
      const pathname = getPathname(request);
      if (pathname.startsWith('/workspaces')) {
        paths.add(getNavigationPath(request));
      }
    });
  }

  return paths;
};

const fetchNavigationSnapshot = async (navigationPath: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    NETWORK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      new Request(new URL(navigationPath, self.location.origin), {
        cache: 'no-store',
        credentials: 'include',
        headers: { accept: 'text/html' },
      }),
      { signal: controller.signal },
    );

    const expectedPathname = getPathname(navigationPath);
    if (!isCacheableNavigationResponse(response, expectedPathname)) {
      return undefined;
    }

    // Keep the timeout active until the complete streamed document has been
    // received. Rebuilding the response from its buffered body also guarantees
    // that Cache.put cannot keep consuming an abandoned network stream.
    return bufferCompatibleNavigationResponse(response);
  } finally {
    clearTimeout(timeoutId);
  }
};

const cacheNavigationPaths = async (paths: Iterable<string>) => {
  const navigationCache = await caches.open(OFFLINE_NAVIGATION_CACHE);
  const pendingPaths = Array.from(
    new Set(
      Array.from(paths)
        .map(normalizeWorkspaceNavigationPath)
        .filter(Boolean),
    ),
  ) as string[];
  const cachedPaths = new Set<string>();
  const workerCount = Math.min(3, pendingPaths.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (pendingPaths.length > 0) {
        const navigationPath = pendingPaths.shift();
        if (!navigationPath) return;

        try {
          const response = await fetchNavigationSnapshot(navigationPath);
          if (!response) continue;

          await navigationCache.put(
            new URL(navigationPath, self.location.origin).toString(),
            response,
          );
          cachedPaths.add(navigationPath);
        } catch {
          // Each route is best-effort. Install safety is decided by the
          // authenticated /workspaces entry below.
        }
      }
    }),
  );

  return cachedPaths;
};

const prepareNavigationCache = async () => {
  const paths = await getPreviouslyCachedWorkspacePaths();
  const hadCachedAuthenticatedRoute = paths.size > 0;
  paths.add('/workspaces');

  await cacheNavigationPaths(paths);
  const navigationCache = await caches.open(OFFLINE_NAVIGATION_CACHE);
  const hasPreparedAuthenticatedEntry = Boolean(
    await matchCachedNavigation(navigationCache, '/workspaces'),
  );
  if (
    self.registration.active &&
    hadCachedAuthenticatedRoute &&
    !hasPreparedAuthenticatedEntry
  ) {
    throw new Error(
      'Keeping the active worker because the current offline pages could not be refreshed',
    );
  }
};

const cleanupPreviousBuildCaches = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          !CURRENT_USER_SCOPED_CACHE_NAMES.has(cacheName) &&
          isUserScopedPwaCacheName(cacheName),
      )
      .map((cacheName) => caches.delete(cacheName)),
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    prepareNavigationCache().catch((error) => {
      if (self.registration.active) throw error;
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupPreviousBuildCaches());
});

const queuedWarmPaths = new Set<string>();
const recentlyWarmedAt = new Map<string, number>();
const NAVIGATION_WARM_COOLDOWN_MS = 60_000;
let navigationWarmPromise: Promise<void> | null = null;

const queueNavigationCacheWarm = (routes: unknown[]) => {
  const now = Date.now();
  routes.forEach((route) => {
    const normalizedRoute = normalizeWorkspaceNavigationPath(route);
    if (!normalizedRoute) return;
    const lastWarmedAt = recentlyWarmedAt.get(normalizedRoute) ?? 0;
    if (now - lastWarmedAt < NAVIGATION_WARM_COOLDOWN_MS) return;
    queuedWarmPaths.add(normalizedRoute);
  });

  if (!navigationWarmPromise) {
    navigationWarmPromise = (async () => {
      while (queuedWarmPaths.size > 0) {
        const batch = Array.from(queuedWarmPaths);
        queuedWarmPaths.clear();
        const cachedPaths = await cacheNavigationPaths(batch);
        const warmedAt = Date.now();
        cachedPaths.forEach((path) => recentlyWarmedAt.set(path, warmedAt));
      }
    })().finally(() => {
      navigationWarmPromise = null;
    });
  }

  return navigationWarmPromise;
};

self.addEventListener('message', (event) => {
  const data = event.data as {
    type?: unknown;
    routes?: unknown;
    route?: unknown;
  } | null;
  const replyPort = event.ports[0];

  if (data?.type === WARM_OFFLINE_NAVIGATION_ROUTES) {
    const routes = Array.isArray(data.routes) ? data.routes : [];
    const operation = queueNavigationCacheWarm(routes).then(
      () => replyPort?.postMessage({ ok: true }),
      () => replyPort?.postMessage({ ok: false }),
    );
    event.waitUntil(operation);
    return;
  }

  if (data?.type === MATCH_OFFLINE_NAVIGATION_ROUTE) {
    const route = normalizeWorkspaceNavigationPath(data.route);
    const operation = (async () => {
      if (!route) return false;
      const cache = await caches.open(OFFLINE_NAVIGATION_CACHE);
      return Boolean(await matchCachedNavigation(cache, route));
    })().then(
      (cached) => replyPort?.postMessage({ ok: true, cached }),
      () => replyPort?.postMessage({ ok: false, cached: false }),
    );
    event.waitUntil(operation);
  }
});

const navigationHandler: RuntimeCaching['handler'] = async ({
  event,
  request,
}) => {
  const pathname = getPathname(request);
  const cache = await caches.open(OFFLINE_NAVIGATION_CACHE);
  const cacheKey = new URL(request.url);
  cacheKey.hash = '';

  try {
    const response = await fetchWithTimeout(request);

    if (response.status >= 500) {
      const cachedResponse = await matchCachedNavigation(cache, request);
      if (cachedResponse) return cachedResponse;
    }

    if (
      pathname.startsWith('/workspaces') &&
      isCacheableNavigationResponse(response, pathname)
    ) {
      // Next sends streamed HTML. Consuming the clone in Cache Storage must not
      // delay the response reaching the page, and cache quota failures must not
      // turn a successful navigation into an offline fallback. The HTML asset
      // check prevents an old worker from storing a newer Next build in its
      // build-specific cache during a rolling deployment.
      event.waitUntil(
        bufferCompatibleNavigationResponse(response.clone())
          .then((snapshot) =>
            snapshot
              ? cache.put(cacheKey.toString(), snapshot)
              : undefined,
          )
          .catch(() => undefined),
      );
    }
    return response;
  } catch {
    return (
      (await matchCachedNavigation(cache, request)) ??
      (await createOfflineDocumentResponse(request, cache))
    );
  }
};

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, request, url }) =>
      sameOrigin &&
      request.method === 'GET' &&
      url.pathname === '/favicon.ico',
    handler: async ({ request }) => {
      const cache = await caches.open(STATIC_IMAGE_CACHE);
      const cacheKey = new Request(
        new URL('/favicon.ico', self.location.origin),
      );

      try {
        const response = await fetchWithTimeout(request);
        if (response.ok) await cache.put(cacheKey, response.clone());
        return response;
      } catch {
        return (
          (await cache.match(cacheKey)) ??
          new Response(null, {
            status: 204,
            headers: { 'Cache-Control': 'no-store' },
          })
        );
      }
    },
  },
  {
    matcher: ({ sameOrigin, request, url }) =>
      sameOrigin &&
      request.method === 'GET' &&
      url.pathname === '/api/auth/me',
    handler: async ({ request }) => {
      try {
        return await fetchWithTimeout(request);
      } catch {
        return createOfflineAuthProbeResponse();
      }
    },
  },
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get('RSC') === '1' &&
      request.headers.get('Next-Router-Prefetch') === '1' &&
      sameOrigin &&
      !pathname.startsWith('/api/'),
    method: 'GET',
    handler: new NetworkFirst({
      cacheName: RSC_PREFETCH_CACHE_NAME,
      plugins: [
        currentBuildRscCachePlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  },
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get('RSC') === '1' &&
      sameOrigin &&
      !pathname.startsWith('/api/'),
    method: 'GET',
    handler: new NetworkFirst({
      cacheName: RSC_CACHE_NAME,
      plugins: [
        currentBuildRscCachePlugin,
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
  {
    matcher: ({ sameOrigin, request }) =>
      sameOrigin &&
      request.method === 'GET' &&
      request.mode === 'navigate',
    handler: navigationHandler,
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith('/api/'),
    handler: async ({ request }) => {
      try {
        return await fetch(request);
      } catch {
        return createOfflineMissResponse(
          'application/json; charset=utf-8',
        );
      }
    },
  },
];

// API failures have explicit sentinel responses above, and a generic
// same-origin catch-all would hide unsupported offline requests. Keep the
// official Serwist page/RSC strategies intact for the Next App Router.
const excludedDefaultCacheNames = new Set([
  'apis',
  'others',
  PAGES_CACHE_NAME.rscPrefetch,
  PAGES_CACHE_NAME.rsc,
  PAGES_CACHE_NAME.html,
]);

runtimeCaching.push(
  ...defaultCache.filter(({ handler }) => {
    if (typeof handler === 'function' || !('cacheName' in handler)) {
      return true;
    }
    return (
      typeof handler.cacheName !== 'string' ||
      !excludedDefaultCacheNames.has(handler.cacheName)
    );
  }),
);

const serwist = new Serwist({
  precacheEntries: PRECACHE_ENTRIES,
  runtimeCaching,
  disableDevLogs: true,
  cacheId: 'taskflow',
});

serwist.addEventListeners();
