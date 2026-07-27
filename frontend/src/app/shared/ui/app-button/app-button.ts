import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TuiButtonLoading } from '@taiga-ui/kit';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Component({
  selector: 'app-button',
  imports: [TuiButton, TuiButtonLoading],
  templateUrl: './app-button.html',
  styleUrl: './app-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly size = input<'s' | 'm'>('s');
  readonly pressed = output<MouseEvent>();

  protected readonly appearance = computed(() => {
    switch (this.variant()) {
      case 'secondary':
        return 'secondary';
      case 'danger':
        return 'primary-destructive';
      case 'ghost':
        return 'flat';
      default:
        return 'primary';
    }
  });
}
