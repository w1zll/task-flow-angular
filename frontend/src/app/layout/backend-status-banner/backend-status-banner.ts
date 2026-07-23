import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export type BackendBannerState = 'hidden' | 'starting' | 'unavailable';

@Component({
  selector: 'app-backend-status-banner',
  imports: [TranslocoPipe],
  templateUrl: './backend-status-banner.html',
  styleUrl: './backend-status-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendStatusBanner {
  readonly state = input<BackendBannerState>('hidden');
  readonly retry = output<void>();
}
