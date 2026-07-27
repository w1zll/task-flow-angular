import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TuiSkeleton } from '@taiga-ui/kit';

@Component({
  selector: 'app-loading-skeleton',
  imports: [TuiSkeleton],
  templateUrl: './loading-skeleton.html',
  styleUrl: './loading-skeleton.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSkeleton {
  readonly lines = input(3);
  protected readonly placeholders = computed(() =>
    Array.from({ length: Math.max(1, this.lines()) }, (_, index) => index),
  );
}
