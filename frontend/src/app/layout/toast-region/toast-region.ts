import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ToastService } from '@shared/ui/toast/toast';

@Component({
  selector: 'app-toast-region',
  imports: [TranslocoPipe],
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastRegion {
  protected readonly toast = inject(ToastService);
}
