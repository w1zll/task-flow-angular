import { Signal, computed, inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  Observable,
  catchError,
  defer,
  finalize,
  from,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { BackendAvailabilityStore } from '@core/backend/backend-availability.store';
import { QueryKey, hashQueryKey, queryKeyStartsWith } from '@core/cache/query-key';

export type QueryStatus = 'loading' | 'success' | 'error';

export interface QueryEntry<T> {
  readonly key: QueryKey;
  readonly status: QueryStatus;
  readonly data?: T;
  readonly error?: ApiError;
  readonly updatedAt: number;
  readonly stale: boolean;
  readonly refreshing: boolean;
  readonly optimistic: boolean;
  readonly pendingMutations: readonly PendingMutation[];
}

export interface PendingMutation {
  readonly id: string;
  readonly entityId: string;
}

export interface OptimisticTransaction {
  readonly id: string;
  readonly entityId: string;
  update<T>(key: QueryKey, updater: (current: T | undefined) => T): void;
  reconcile<T>(key: QueryKey, updater: (current: T | undefined) => T): void;
  commit(): void;
  rollback(): void;
  isActive(): boolean;
}

export interface QueryOptions {
  readonly staleTime?: number;
  readonly force?: boolean;
}

interface QueryCacheState {
  readonly entries: Readonly<Record<string, QueryEntry<unknown>>>;
}

const initialState: QueryCacheState = {
  entries: {},
};

const safeError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  return new ApiError('unknown', 0, 'unknown_error', false);
};

const mutationId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const structurallyEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (typeof left !== 'object') return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]))
    );
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && structurallyEqual(leftRecord[key], rightRecord[key]),
    )
  );
};

export const QueryCacheStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const backend = inject(BackendAvailabilityStore);
    const inFlight = new Map<string, Observable<unknown>>();
    let cacheEpoch = 0;

    const write = <T>(key: QueryKey, entry: QueryEntry<T>): void => {
      const hash = hashQueryKey(key);

      patchState(store, {
        entries: {
          ...store.entries(),
          [hash]: entry,
        },
      });
    };

    const removeByHash = (hash: string): void => {
      const entries = { ...store.entries() };
      delete entries[hash];
      patchState(store, { entries });
    };

    return {
      entry<T>(key: QueryKey): Signal<QueryEntry<T> | undefined> {
        const hash = hashQueryKey(key);

        return computed(() => store.entries()[hash] as QueryEntry<T> | undefined);
      },
      get<T>(key: QueryKey): T | undefined {
        return (store.entries()[hashQueryKey(key)] as QueryEntry<T> | undefined)?.data;
      },
      execute<T>(
        key: QueryKey,
        loader: () => Observable<T>,
        options: QueryOptions = {},
      ): Observable<T> {
        const hash = hashQueryKey(key);
        const cached = store.entries()[hash] as QueryEntry<T> | undefined;
        const staleTime = options.staleTime ?? 30_000;
        const serveCached = !options.force && cached?.status === 'success';

        const pending = inFlight.get(hash) as Observable<T> | undefined;
        if (pending) return serveCached ? of(cached.data as T) : pending;

        const epoch = cacheEpoch;
        write(key, {
          key,
          status: serveCached ? 'success' : 'loading',
          data: cached?.data,
          error: serveCached ? undefined : cached?.error,
          updatedAt: cached?.updatedAt ?? 0,
          stale:
            (cached?.stale ?? !cached?.updatedAt) || Date.now() - cached.updatedAt >= staleTime,
          refreshing: serveCached,
          optimistic: cached?.optimistic ?? false,
          pendingMutations: cached?.pendingMutations ?? [],
        });

        const request$ = defer(() => from(backend.waitUntilReady())).pipe(
          switchMap(loader),
          tap((data) => {
            if (cacheEpoch !== epoch) return;
            const current = store.entries()[hash] as QueryEntry<T> | undefined;

            if (current?.pendingMutations.length) {
              write(key, {
                ...current,
                stale: true,
                refreshing: false,
              });
              return;
            }

            write(key, {
              key,
              status: 'success',
              data: structurallyEqual(current?.data, data) ? current?.data : data,
              updatedAt: Date.now(),
              stale: false,
              refreshing: false,
              optimistic: false,
              pendingMutations: [],
            });
          }),
          catchError((error: unknown) => {
            if (cacheEpoch === epoch) {
              const current = store.entries()[hash] as QueryEntry<T> | undefined;
              if (serveCached && current?.data !== undefined) {
                write(key, {
                  ...current,
                  status: 'success',
                  error: undefined,
                  stale: true,
                  refreshing: false,
                });
              } else {
                write(key, {
                  key,
                  status: 'error',
                  data: cached?.data,
                  error: safeError(error),
                  updatedAt: cached?.updatedAt ?? 0,
                  stale: true,
                  refreshing: false,
                  optimistic: false,
                  pendingMutations: [],
                });
              }
            }

            return throwError(() => error);
          }),
          finalize(() => {
            if (inFlight.get(hash) === request$) {
              inFlight.delete(hash);
            }
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );

        inFlight.set(hash, request$);

        if (serveCached) {
          request$.subscribe({ error: () => undefined });
          return of(cached.data as T);
        }

        return request$;
      },
      set<T>(key: QueryKey, data: T): void {
        write(key, {
          key,
          status: 'success',
          data,
          updatedAt: Date.now(),
          stale: false,
          refreshing: false,
          optimistic: false,
          pendingMutations: [],
        });
      },
      update<T>(key: QueryKey, updater: (current: T | undefined) => T): void {
        const current = (store.entries()[hashQueryKey(key)] as QueryEntry<T> | undefined)?.data;

        write(key, {
          key,
          status: 'success',
          data: updater(current),
          updatedAt: Date.now(),
          stale: false,
          refreshing: false,
          optimistic: false,
          pendingMutations: [],
        });
      },
      updateFromServer<T>(
        key: QueryKey,
        updater: (current: T | undefined) => T,
        options: { readonly skipIfPending?: boolean } = {},
      ): void {
        const hash = hashQueryKey(key);
        const current = store.entries()[hash] as QueryEntry<T> | undefined;
        if (options.skipIfPending && current?.pendingMutations.length) return;

        write(key, {
          key,
          status: 'success',
          data: updater(current?.data),
          updatedAt: Date.now(),
          stale: false,
          refreshing: false,
          optimistic: (current?.pendingMutations.length ?? 0) > 0,
          pendingMutations: current?.pendingMutations ?? [],
        });
      },
      optimisticUpdate<T>(key: QueryKey, updater: (current: T | undefined) => T): () => void {
        const hash = hashQueryKey(key);
        const snapshot = store.entries()[hash] as QueryEntry<T> | undefined;

        write(key, {
          key,
          status: 'success',
          data: updater(snapshot?.data),
          updatedAt: snapshot?.updatedAt ?? Date.now(),
          stale: false,
          refreshing: false,
          optimistic: true,
          pendingMutations: snapshot?.pendingMutations ?? [],
        });

        return () => {
          if (snapshot) {
            write(key, snapshot);
          } else {
            removeByHash(hash);
          }
        };
      },
      optimisticTransaction(entityId: string): OptimisticTransaction {
        const id = mutationId();
        const epoch = cacheEpoch;
        const snapshots = new Map<string, QueryEntry<unknown> | undefined>();
        const keys = new Map<string, QueryKey>();
        let settled = false;

        const isActive = (): boolean => !settled && cacheEpoch === epoch;
        const remember = (key: QueryKey): string => {
          const hash = hashQueryKey(key);
          if (!snapshots.has(hash)) {
            snapshots.set(hash, store.entries()[hash]);
            keys.set(hash, key);
          }
          return hash;
        };
        const withoutOwnMarker = (entry: QueryEntry<unknown>): readonly PendingMutation[] =>
          entry.pendingMutations.filter((pending) => pending.id !== id);

        return {
          id,
          entityId,
          update<T>(key: QueryKey, updater: (current: T | undefined) => T): void {
            if (!isActive()) return;
            const hash = remember(key);
            const current = store.entries()[hash] as QueryEntry<T> | undefined;

            write(key, {
              key,
              status: 'success',
              data: updater(current?.data),
              updatedAt: current?.updatedAt ?? Date.now(),
              stale: false,
              refreshing: false,
              optimistic: true,
              pendingMutations: [
                ...(current?.pendingMutations ?? []).filter((pending) => pending.id !== id),
                { id, entityId },
              ],
            });
          },
          reconcile<T>(key: QueryKey, updater: (current: T | undefined) => T): void {
            if (!isActive()) return;
            const hash = remember(key);
            const current = store.entries()[hash] as QueryEntry<T> | undefined;
            const pendingMutations = current ? withoutOwnMarker(current) : [];

            write(key, {
              key,
              status: 'success',
              data: updater(current?.data),
              updatedAt: Date.now(),
              stale: false,
              refreshing: false,
              optimistic: pendingMutations.length > 0,
              pendingMutations,
            });
          },
          commit(): void {
            if (!isActive()) return;
            for (const [hash, key] of keys) {
              const current = store.entries()[hash];
              if (!current) continue;
              const pendingMutations = withoutOwnMarker(current);
              write(key, {
                ...current,
                optimistic: pendingMutations.length > 0,
                pendingMutations,
              });
            }
            settled = true;
          },
          rollback(): void {
            if (!isActive()) return;
            for (const [hash, key] of keys) {
              const snapshot = snapshots.get(hash);
              if (snapshot) {
                write(key, snapshot);
              } else {
                removeByHash(hash);
              }
            }
            settled = true;
          },
          isActive,
        };
      },
      invalidate(prefix: QueryKey): void {
        const entries = Object.fromEntries(
          Object.entries(store.entries()).map(([hash, entry]) => [
            hash,
            queryKeyStartsWith(entry.key, prefix) ? { ...entry, stale: true } : entry,
          ]),
        );

        patchState(store, { entries });
      },
      remove(key: QueryKey): void {
        removeByHash(hashQueryKey(key));
      },
      clearPrivate(): void {
        cacheEpoch += 1;
        inFlight.clear();
        patchState(store, { entries: {} });
      },
    };
  }),
);
