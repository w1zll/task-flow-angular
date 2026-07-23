import { computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

import { BackendAvailabilityService } from '@core/backend/backend-availability';
import { ToastService } from '@shared/ui/toast/toast';

export type BackendAvailabilityStatus = 'checking' | 'starting' | 'ready' | 'unavailable';

interface BackendAvailabilityState {
  readonly status: BackendAvailabilityStatus;
}

const initialState: BackendAvailabilityState = {
  status: 'checking',
};

export const BackendAvailabilityStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status }) => ({
    isReady: computed(() => status() === 'ready'),
    bannerState: computed(() => {
      const current = status();

      return current === 'starting' || current === 'unavailable' ? current : 'hidden';
    }),
  })),
  withMethods((store) => {
    const availability = inject(BackendAvailabilityService);
    const toast = inject(ToastService);
    const transloco = inject(TranslocoService);
    const readyWaiters = new Set<() => void>();

    const markReady = (waited: boolean): void => {
      patchState(store, { status: 'ready' });
      readyWaiters.forEach((resolve) => resolve());
      readyWaiters.clear();

      if (waited) toast.show(transloco.translate('backend.ready'), 'success');
    };

    return {
      start(): void {
        availability.start({
          checking: () => patchState(store, { status: 'checking' }),
          starting: () => patchState(store, { status: 'starting' }),
          ready: markReady,
          unavailable: () => patchState(store, { status: 'unavailable' }),
        });
      },
      retry(): void {
        availability.retry();
      },
      waitUntilReady(): Promise<void> {
        if (store.status() === 'ready') return Promise.resolve();

        return new Promise((resolve) => readyWaiters.add(resolve));
      },
      stop(): void {
        availability.stop();
        readyWaiters.clear();
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.start();
    },
    onDestroy(store) {
      store.stop();
    },
  }),
);
