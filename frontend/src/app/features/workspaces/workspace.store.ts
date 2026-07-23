import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { BoardsApi } from '@core/api/clients/boards-api';
import { WorkspacesApi } from '@core/api/clients/workspaces-api';
import { BoardResponseDto, WorkspaceResponseDto } from '@core/api/generated';
import { AuthStore } from '@core/auth/auth.store';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';

interface WorkspaceState {
  readonly mutationStatus: 'idle' | 'loading';
  readonly mutationErrorKey: string | null;
}

const initialState: WorkspaceState = {
  mutationStatus: 'idle',
  mutationErrorKey: null,
};

const workspaceErrorKey = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'workspaces.errors.unknown';
  if (error.kind === 'forbidden') return 'workspaces.errors.forbidden';
  if (error.kind === 'not-found') return 'workspaces.errors.notFound';
  if (error.kind === 'validation') return 'workspaces.errors.invalidData';
  if (error.kind === 'network' || error.kind === 'server') {
    return 'workspaces.errors.unavailable';
  }

  return 'workspaces.errors.unknown';
};

export const WorkspaceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => {
    const cache = inject(QueryCacheStore);

    return {
      cache,
      workspaceQuery: cache.entry<readonly WorkspaceResponseDto[]>(queryKeys.workspaces),
      boardQuery: cache.entry<readonly BoardResponseDto[]>(queryKeys.boardsCatalog),
    };
  }),
  withComputed(({ boardQuery, workspaceQuery }) => ({
    workspaces: computed(() => workspaceQuery()?.data ?? []),
    boards: computed(() => boardQuery()?.data ?? []),
    isLoading: computed(
      () =>
        !workspaceQuery() ||
        !boardQuery() ||
        workspaceQuery()?.status === 'loading' ||
        boardQuery()?.status === 'loading',
    ),
    loadErrorKey: computed(() => {
      const error = workspaceQuery()?.error ?? boardQuery()?.error;

      return error ? workspaceErrorKey(error) : null;
    }),
  })),
  withMethods((store) => {
    const auth = inject(AuthStore);
    const boardsApi = inject(BoardsApi);
    const workspacesApi = inject(WorkspacesApi);

    const setMutationError = (error: unknown): void => {
      patchState(store, {
        mutationStatus: 'idle',
        mutationErrorKey: workspaceErrorKey(error),
      });
    };

    return {
      async load(force = false): Promise<void> {
        try {
          await Promise.all([
            firstValueFrom(
              store.cache.execute(queryKeys.workspaces, () => workspacesApi.list(), {
                staleTime: 30_000,
                force,
              }),
            ),
            firstValueFrom(
              store.cache.execute(queryKeys.boardsCatalog, () => boardsApi.list(), {
                staleTime: 30_000,
                force,
              }),
            ),
          ]);
        } catch {}
      },
      boardsFor(workspaceId: string): readonly BoardResponseDto[] {
        return store.boards().filter((board) => board.workspaceId === workspaceId);
      },
      async create(name: string): Promise<WorkspaceResponseDto> {
        patchState(store, { mutationStatus: 'loading', mutationErrorKey: null });

        try {
          const created = await firstValueFrom(
            workspacesApi.create({
              body: {
                name: name.trim(),
              },
            }),
          );
          store.cache.update<readonly WorkspaceResponseDto[]>(
            queryKeys.workspaces,
            (workspaces = []) => [
              ...workspaces.map((workspace) => ({ ...workspace, isActive: false })),
              created,
            ],
          );
          auth.setActiveWorkspace(created.id);
          patchState(store, { mutationStatus: 'idle' });
          return created;
        } catch (error) {
          setMutationError(error);
          throw error;
        }
      },
      async switchActive(workspaceId: string): Promise<WorkspaceResponseDto> {
        const current = store.workspaces().find((workspace) => workspace.id === workspaceId);
        if (current?.isActive) return current;

        patchState(store, { mutationStatus: 'loading', mutationErrorKey: null });

        try {
          const active = await firstValueFrom(
            workspacesApi.switchActive({
              id: workspaceId,
            }),
          );
          store.cache.update<readonly WorkspaceResponseDto[]>(
            queryKeys.workspaces,
            (workspaces = []) =>
              workspaces.map((workspace) => ({
                ...workspace,
                isActive: workspace.id === workspaceId,
              })),
          );
          auth.setActiveWorkspace(workspaceId);
          patchState(store, { mutationStatus: 'idle' });
          return active;
        } catch (error) {
          setMutationError(error);
          throw error;
        }
      },
      async remove(workspaceId: string): Promise<string | null> {
        patchState(store, { mutationStatus: 'loading', mutationErrorKey: null });

        try {
          await firstValueFrom(workspacesApi.remove({ id: workspaceId }));
          const remaining = store.workspaces().filter((workspace) => workspace.id !== workspaceId);
          const removedWasActive = store
            .workspaces()
            .some((workspace) => workspace.id === workspaceId && workspace.isActive);
          const currentActive = remaining.find((workspace) => workspace.isActive)?.id ?? null;
          const fallbackId = removedWasActive ? (remaining[0]?.id ?? null) : currentActive;

          store.cache.set(
            queryKeys.workspaces,
            remaining.map((workspace) => ({
              ...workspace,
              isActive: workspace.id === fallbackId,
            })),
          );
          store.cache.update<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) =>
            boards.filter((board) => board.workspaceId !== workspaceId),
          );
          if (removedWasActive) auth.setActiveWorkspace(fallbackId);
          patchState(store, { mutationStatus: 'idle' });
          return fallbackId;
        } catch (error) {
          setMutationError(error);
          throw error;
        }
      },
      clearMutationError(): void {
        patchState(store, { mutationErrorKey: null });
      },
    };
  }),
);
