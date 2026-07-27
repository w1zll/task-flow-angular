import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiRoot } from '@taiga-ui/core';

import { BackendStatusBanner } from '@layout/backend-status-banner/backend-status-banner';
import { AppHeader } from '@layout/app-header/app-header';
import { ToastRegion } from '@layout/toast-region/toast-region';
import { BackendAvailabilityStore } from '@core/backend/backend-availability.store';
import { ThemeService } from '@core/theme/theme';

@Component({
  selector: 'app-root',
  imports: [AppHeader, BackendStatusBanner, RouterOutlet, ToastRegion, TranslocoPipe, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly backendAvailability = inject(BackendAvailabilityStore);
  protected readonly theme = inject(ThemeService);

  readonly backendBannerState = this.backendAvailability.bannerState;

  retryBackend(): void {
    this.backendAvailability.retry();
  }
}
