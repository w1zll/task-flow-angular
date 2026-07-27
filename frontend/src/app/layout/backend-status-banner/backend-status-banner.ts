import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiButton, TuiLoader, TuiNotification } from '@taiga-ui/core';

export type BackendBannerState = 'hidden' | 'starting' | 'unavailable';

@Component({
  selector: 'app-backend-status-banner',
  imports: [TranslocoPipe, TuiButton, TuiLoader, TuiNotification],
  templateUrl: './backend-status-banner.html',
  styleUrl: './backend-status-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendStatusBanner {
  readonly state = input<BackendBannerState>('hidden');
  readonly retry = output<void>();
}
