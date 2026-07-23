export const OFFLINE_NAVIGATION_CACHE_PREFIX =
  'taskflow-pwa-navigation-pages-';

export const LEGACY_OFFLINE_NAVIGATION_CACHE =
  `${OFFLINE_NAVIGATION_CACHE_PREFIX}v1`;

export const getOfflineNavigationCacheName = (buildVersion: string) =>
  `${OFFLINE_NAVIGATION_CACHE_PREFIX}${buildVersion}`;

export const WARM_OFFLINE_NAVIGATION_ROUTES =
  'taskflow:warm-offline-navigation-routes';

export const MATCH_OFFLINE_NAVIGATION_ROUTE =
  'taskflow:match-offline-navigation-route';

// Deliberately does not use the taskflow-pwa-* prefix. These tiny preferences
// are not user data and must survive user-scoped cache cleanup and SW updates.
export const OFFLINE_DOCUMENT_PREFERENCES_CACHE =
  'taskflow-offline-preferences-v1';

export const OFFLINE_DOCUMENT_LOCALE_PATH =
  '/__taskflow/offline-document-locale';

export const OFFLINE_DOCUMENT_AUTHENTICATION_PATH =
  '/__taskflow/offline-document-authentication';

const LEGACY_TASKFLOW_CACHE_PREFIX = 'taskflow-pwa-';

const SERWIST_USER_SCOPED_CACHES = new Set([
  'apis',
  'others',
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
]);

export const isOfflineNavigationCacheName = (cacheName: string) =>
  cacheName.startsWith(OFFLINE_NAVIGATION_CACHE_PREFIX) ||
  (cacheName.startsWith(LEGACY_TASKFLOW_CACHE_PREFIX) &&
    (cacheName.endsWith('-pages') || cacheName.endsWith('-shell')));

export const isUserScopedPwaCacheName = (cacheName: string) =>
  cacheName.startsWith(LEGACY_TASKFLOW_CACHE_PREFIX) ||
  SERWIST_USER_SCOPED_CACHES.has(cacheName);
