import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly messages = signal<readonly ToastMessage[]>([]);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
    });
  }

  show(message: string, tone: ToastTone = 'info', duration = 4_000): number {
    const id = ++this.nextId;

    this.messages.update((messages) => [...messages, { id, message, tone }]);

    if (this.isBrowser && duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }
}
