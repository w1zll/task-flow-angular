import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiButton, TuiNotification } from '@taiga-ui/core';

import { ToastService, ToastTone } from '@shared/ui/toast/toast';

@Component({
  selector: 'app-toast-region',
  imports: [TranslocoPipe, TuiButton, TuiNotification],
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastRegion {
  protected readonly toast = inject(ToastService);

  protected appearance(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'positive';
      case 'warning':
        return 'warning';
      case 'error':
        return 'negative';
      default:
        return 'info';
    }
  }
}
