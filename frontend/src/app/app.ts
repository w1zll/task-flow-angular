import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { BackendStatusBanner } from '@layout/backend-status-banner/backend-status-banner';
import { AppHeader } from '@layout/app-header/app-header';
import { ToastRegion } from '@layout/toast-region/toast-region';

@Component({
  selector: 'app-root',
  imports: [AppHeader, BackendStatusBanner, RouterOutlet, ToastRegion, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
