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
  readonly optimistic: boolean;
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

        if (
          !options.force &&
          cached?.status === 'success' &&
          !cached.stale &&
          Date.now() - cached.updatedAt < staleTime
        ) {
          return of(cached.data as T);
        }

        const pending = inFlight.get(hash) as Observable<T> | undefined;
        if (pending) return pending;

        const epoch = cacheEpoch;
        write(key, {
          key,
          status: 'loading',
          data: cached?.data,
          updatedAt: cached?.updatedAt ?? 0,
          stale: cached?.stale ?? true,
          optimistic: cached?.optimistic ?? false,
        });

        const request$ = defer(() => from(backend.waitUntilReady())).pipe(
          switchMap(loader),
          tap((data) => {
            if (cacheEpoch !== epoch) return;

            write(key, {
              key,
              status: 'success',
              data,
              updatedAt: Date.now(),
              stale: false,
              optimistic: false,
            });
          }),
          catchError((error: unknown) => {
            if (cacheEpoch === epoch) {
              write(key, {
                key,
                status: 'error',
                data: cached?.data,
                error: safeError(error),
                updatedAt: cached?.updatedAt ?? 0,
                stale: true,
                optimistic: false,
              });
            }

            return throwError(() => error);
          }),
          finalize(() => inFlight.delete(hash)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );

        inFlight.set(hash, request$);

        return request$;
      },
      set<T>(key: QueryKey, data: T): void {
        write(key, {
          key,
          status: 'success',
          data,
          updatedAt: Date.now(),
          stale: false,
          optimistic: false,
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
          optimistic: false,
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
          optimistic: true,
        });

        return () => {
          if (snapshot) {
            write(key, snapshot);
          } else {
            removeByHash(hash);
          }
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
