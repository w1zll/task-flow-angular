import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBlockStatus } from '@taiga-ui/layout';

@Component({
  selector: 'app-empty-state',
  imports: [TuiBlockStatus],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
