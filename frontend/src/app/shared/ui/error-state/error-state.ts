import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

import { AppButton } from '@shared/ui/app-button/app-button';

@Component({
  selector: 'app-error-state',
  imports: [AppButton, TuiBlockStatus],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly retryLabel = input<string>();
  readonly retry = output<void>();
}
