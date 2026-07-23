'use client';

import type { DehydratedState, Query } from '@tanstack/react-query';
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';

const DB_NAME = 'taskflow-query-cache';
const DB_VERSION = 1;
const STORE_NAME = 'query-cache';
const CACHE_KEY = 'taskflow-query-cache-v1';
const LEGACY_QUERY_CACHE_BUSTER = 'taskflow-pwa-readonly-offline-v1';
export const QUERY_CACHE_BUSTER = 'taskflow-pwa-readonly-offline-v3';
export const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;
export const QUERY_CACHE_OPERATION_TIMEOUT_MS = 3000;
const PERSIST_THROTTLE_MS = 1200;

let dbPromise: Promise<IDBDatabase> | null = null;
let persistTimer: number | null = null;
let pendingClient: PersistedClient | null = null;
let pendingWaiters: Array<() => void> = [];
let operationChain: Promise<void> = Promise.resolve();

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && 'indexedDB' in window;

type LegacyPersistedClient = {
  buster: string;
  timestamp: number;
  state: DehydratedState;
};

const isDehydratedState = (value: unknown): value is DehydratedState => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as {
    mutations?: unknown;
    queries?: unknown;
  };
  if (!Array.isArray(candidate.queries)) return false;
  if (
    typeof candidate.mutations !== 'undefined' &&
    !Array.isArray(candidate.mutations)
  ) {
    return false;
  }

  return candidate.queries.every(
    (query) =>
      query &&
      typeof query === 'object' &&
      Array.isArray((query as { queryKey?: unknown }).queryKey) &&
      typeof (query as { queryHash?: unknown }).queryHash === 'string' &&
      Boolean((query as { state?: unknown }).state) &&
      typeof (query as { state?: unknown }).state === 'object',
  );
};

export const settleWithin = <T>(
  operation: Promise<T>,
  timeoutMs: number,
  fallback: T,
) =>
  new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(fallback), timeoutMs);

    void operation.then(finish, () => finish(fallback));
  });

export const normalizePersistedClient = (
  value: unknown,
): PersistedClient | undefined => {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as Partial<PersistedClient & LegacyPersistedClient>;
  if (
    typeof candidate.timestamp !== 'number' ||
    typeof candidate.buster !== 'string'
  ) {
    return undefined;
  }

  if (isDehydratedState(candidate.clientState)) {
    return candidate as PersistedClient;
  }

  if (
    candidate.buster === LEGACY_QUERY_CACHE_BUSTER &&
    isDehydratedState(candidate.state)
  ) {
    return {
      timestamp: candidate.timestamp,
      buster: QUERY_CACHE_BUSTER,
      clientState: candidate.state,
    };
  }

  return undefined;
};

const openDb = () => {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }

  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('IndexedDB open request was blocked'));
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
};

const readPersistedClient = async () => {
  if (!canUseIndexedDb()) return undefined;

  const db = await openDb();
  return new Promise<PersistedClient | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(CACHE_KEY);

    request.onsuccess = () => {
      const rawValue = request.result as unknown;
      if (!rawValue) {
        resolve(undefined);
        return;
      }
      const value = normalizePersistedClient(rawValue);
      if (!value) {
        resolve(undefined);
        void removePersistedClient();
        return;
      }
      resolve(value);
    };
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to read IndexedDB cache'));
  });
};

const writePersistedClient = async (client: PersistedClient) => {
  if (!canUseIndexedDb()) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put(client, CACHE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to write IndexedDB cache'));
  });
};

const removePersistedClient = async () => {
  if (!canUseIndexedDb()) return;

  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  pendingClient = null;
  pendingWaiters.splice(0).forEach((resolve) => resolve());

  operationChain = operationChain.catch(() => undefined).then(async () => {
    await settleWithin(
      (async () => {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const request = transaction.objectStore(STORE_NAME).delete(CACHE_KEY);

          request.onsuccess = () => resolve();
          request.onerror = () =>
            reject(
              request.error ?? new Error('Failed to clear IndexedDB cache'),
            );
        });
      })(),
      QUERY_CACHE_OPERATION_TIMEOUT_MS,
      undefined,
    );
  });

  await operationChain;
};

const flushPersistedClient = () => {
  persistTimer = null;
  const client = pendingClient;
  const waiters = pendingWaiters;
  pendingClient = null;
  pendingWaiters = [];
  if (!client) {
    waiters.forEach((resolve) => resolve());
    return;
  }

  operationChain = operationChain
    .catch(() => undefined)
    .then(() =>
      settleWithin(
        writePersistedClient(client),
        QUERY_CACHE_OPERATION_TIMEOUT_MS,
        undefined,
      ),
    );
  void operationChain.then(
    () => waiters.forEach((resolve) => resolve()),
    (error) => {
      console.warn('[PWA] Failed to persist query cache', error);
      waiters.forEach((resolve) => resolve());
    },
  );
};

const persistClient = (client: PersistedClient) => {
  if (!canUseIndexedDb()) return Promise.resolve();

  pendingClient = client;
  const result = new Promise<void>((resolve) => {
    pendingWaiters.push(resolve);
  });

  if (persistTimer === null) {
    persistTimer = window.setTimeout(
      flushPersistedClient,
      PERSIST_THROTTLE_MS,
    );
  }

  return result;
};

export const queryCachePersister: Persister = {
  persistClient,
  restoreClient: () =>
    settleWithin(
      readPersistedClient(),
      QUERY_CACHE_OPERATION_TIMEOUT_MS,
      undefined,
    ),
  removeClient: () =>
    settleWithin(
      removePersistedClient(),
      QUERY_CACHE_OPERATION_TIMEOUT_MS,
      undefined,
    ),
};

export const shouldPersistQuery = (query: Query) => {
  if (query.state.status !== 'success' || query.state.dataUpdatedAt <= 0) {
    return false;
  }

  const [scope, , childScope] = query.queryKey;
  if (scope === 'boards') return true;
  if (scope !== 'workspaces') return false;

  return childScope !== 'invites';
};

export const clearPersistedQueryCache = async () => {
  try {
    await queryCachePersister.removeClient();
  } catch (error) {
    console.warn('[PWA] Failed to clear persisted query cache', error);
  }
};
