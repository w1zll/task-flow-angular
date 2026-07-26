import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { AuthApi } from '@core/api/clients/auth-api';
import { LoginDto, RegisterRequestDto, UserDto } from '@core/api/generated';
import { BackendAvailabilityStore } from '@core/backend/backend-availability.store';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'guest';

interface AuthState {
  readonly user: UserDto | null;
  readonly status: AuthStatus;
  readonly hydrated: boolean;
  readonly errorKey: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  hydrated: false,
  errorKey: null,
};

const authErrorKey = (error: unknown, action: 'login' | 'register' | 'session'): string => {
  if (!(error instanceof ApiError)) return 'auth.errors.unknown';
  if (action === 'login' && error.kind === 'unauthorized') {
    return 'auth.errors.invalidCredentials';
  }
  if (action === 'register' && error.kind === 'conflict') {
    return 'auth.errors.emailTaken';
  }
  if (error.kind === 'validation') return 'auth.errors.invalidData';
  if (error.kind === 'network' || error.kind === 'server' || error.kind === 'unexpected-response') {
    return 'auth.errors.unavailable';
  }
  if (action === 'session') return 'auth.errors.session';

  return 'auth.errors.unknown';
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status, user }) => ({
    isAuthenticated: computed(() => status() === 'authenticated' && user() !== null),
    isLoading: computed(() => status() === 'idle' || status() === 'loading'),
  })),
  withMethods((store) => {
    const authApi = inject(AuthApi);
    const backend = inject(BackendAvailabilityStore);
    const cache = inject(QueryCacheStore);
    let bootstrapRequest: Promise<void> | null = null;

    const setAuthenticated = (user: UserDto): void => {
      cache.set(queryKeys.authUser, user);
      patchState(store, {
        user,
        status: 'authenticated',
        hydrated: true,
        errorKey: null,
      });
    };

    const finishAuthentication = (user: UserDto): void => {
      cache.clearPrivate();
      setAuthenticated(user);
    };

    const setGuest = (errorKey: string | null = null): void => {
      patchState(store, {
        user: null,
        status: 'guest',
        hydrated: true,
        errorKey,
      });
    };

    return {
      bootstrap(): Promise<void> {
        if (store.status() === 'authenticated' || store.status() === 'guest') {
          return Promise.resolve();
        }
        if (bootstrapRequest) return bootstrapRequest;

        patchState(store, { status: 'loading', errorKey: null });
        bootstrapRequest = backend
          .waitUntilReady()
          .then(() =>
            firstValueFrom(
              cache.execute(queryKeys.authUser, () => authApi.me(), {
                staleTime: 60_000,
              }),
            ),
          )
          .then(setAuthenticated)
          .catch((error: unknown) => {
            const errorKey =
              error instanceof ApiError && error.kind === 'unauthorized'
                ? null
                : authErrorKey(error, 'session');
            setGuest(errorKey);
          })
          .finally(() => {
            bootstrapRequest = null;
          });

        return bootstrapRequest;
      },
      async login(credentials: LoginDto): Promise<UserDto> {
        patchState(store, { status: 'loading', errorKey: null });

        try {
          const response = await firstValueFrom(authApi.login({ body: credentials }));
          finishAuthentication(response.user);
          return response.user;
        } catch (error) {
          setGuest(authErrorKey(error, 'login'));
          throw error;
        }
      },
      async register(data: RegisterRequestDto): Promise<UserDto> {
        patchState(store, { status: 'loading', errorKey: null });

        try {
          const response = await firstValueFrom(authApi.register({ body: data }));
          finishAuthentication(response.user);
          return response.user;
        } catch (error) {
          setGuest(authErrorKey(error, 'register'));
          throw error;
        }
      },
      async completeOAuth(): Promise<UserDto> {
        const currentUser = store.user();
        if (store.status() === 'authenticated' && currentUser) return currentUser;

        if (bootstrapRequest) {
          await bootstrapRequest;
          const bootstrappedUser = store.user();
          if (store.status() === 'authenticated' && bootstrappedUser) {
            return bootstrappedUser;
          }
        }

        patchState(store, { status: 'loading', errorKey: null });

        try {
          await backend.waitUntilReady();
          const user = await firstValueFrom(authApi.me());
          finishAuthentication(user);
          return user;
        } catch (error) {
          setGuest(authErrorKey(error, 'session'));
          throw error;
        }
      },
      async logout(): Promise<void> {
        patchState(store, { status: 'loading', errorKey: null });

        try {
          await firstValueFrom(authApi.logout());
        } catch {
        } finally {
          cache.clearPrivate();
          setGuest();
        }
      },
      clearError(): void {
        patchState(store, { errorKey: null });
      },
      setActiveWorkspace(workspaceId: string | null): void {
        const user = store.user();
        if (!user) return;

        const updatedUser = {
          ...user,
          activeWorkspaceId: workspaceId,
        };
        cache.set(queryKeys.authUser, updatedUser);
        patchState(store, { user: updatedUser });
      },
    };
  }),
  withHooks({
    onInit(store) {
      void store.bootstrap();
    },
  }),
);
