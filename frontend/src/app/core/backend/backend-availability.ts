import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface BackendAvailabilityHandlers {
  readonly checking: () => void;
  readonly starting: () => void;
  readonly ready: (waited: boolean) => void;
  readonly unavailable: () => void;
}

const START_NOTICE_DELAY_MS = 1_500;
const PROBE_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 2_500;

@Injectable({
  providedIn: 'root',
})
export class BackendAvailabilityService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private handlers: BackendAvailabilityHandlers | null = null;
  private controller: AbortController | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private ready = false;
  private unavailable = false;
  private noticeShown = false;

  private readonly handleOnline = (): void => this.beginCycle();
  private readonly handleOffline = (): void => {
    this.clearCycle();
    this.ready = false;
    this.handlers?.checking();
  };
  private readonly handleFocus = (): void => {
    if (!this.ready && !this.unavailable) this.probe();
  };
  private readonly handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && !this.ready && !this.unavailable) this.probe();
  };

  start(handlers: BackendAvailabilityHandlers): void {
    if (!this.isBrowser) return;

    this.stop();
    this.handlers = handlers;
    this.active = true;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('focus', this.handleFocus);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.beginCycle();
  }

  retry(): void {
    if (!this.active) return;

    this.beginCycle();
  }

  stop(): void {
    if (!this.isBrowser) return;

    this.active = false;
    this.ready = false;
    this.clearCycle();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('focus', this.handleFocus);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.handlers = null;
  }

  private beginCycle(): void {
    if (!this.active) return;

    this.clearCycle();
    this.ready = false;
    this.unavailable = false;
    this.noticeShown = false;
    this.handlers?.checking();

    if (!navigator.onLine) return;

    this.noticeTimer = setTimeout(() => {
      this.noticeShown = true;
      this.handlers?.starting();
    }, START_NOTICE_DELAY_MS);
    this.deadlineTimer = setTimeout(() => {
      this.controller?.abort();
      this.controller = null;
      this.clearRetryTimer();
      this.unavailable = true;
      this.handlers?.unavailable();
    }, PROBE_TIMEOUT_MS);
    this.probe();
  }

  private probe(): void {
    if (!this.active || this.ready || this.unavailable || this.controller || !navigator.onLine)
      return;

    const controller = new AbortController();
    this.controller = controller;

    void fetch('/api/health', {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('health_check_failed');
        if (!this.active || this.controller !== controller) return;

        const waited = this.noticeShown;
        this.ready = true;
        this.clearCycle(false);
        this.handlers?.ready(waited);
      })
      .catch(() => {
        if (!this.active || this.controller !== controller) return;

        if (!navigator.onLine) {
          this.handleOffline();
          return;
        }

        this.noticeShown = true;
        this.handlers?.starting();
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.probe();
        }, RETRY_DELAY_MS);
      })
      .finally(() => {
        if (this.controller === controller) this.controller = null;
      });
  }

  private clearCycle(abort = true): void {
    if (abort) this.controller?.abort();
    this.controller = null;

    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    if (this.deadlineTimer) clearTimeout(this.deadlineTimer);
    this.noticeTimer = null;
    this.deadlineTimer = null;
    this.clearRetryTimer();
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
