import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiSelect } from '@taiga-ui/kit';

import { ColumnResponseDto, TaskResponseDto } from '@core/api/generated';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { AppButton } from '@shared/ui/app-button/app-button';

@Component({
  selector: 'app-task-card',
  imports: [AppButton, FormsModule, LocalizedDatePipe, TranslocoPipe, TuiSelect],
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCard {
  readonly task = input.required<TaskResponseDto>();
  readonly columns = input.required<readonly ColumnResponseDto[]>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly canEdit = input(false);
  readonly canReorder = input(true);
  readonly busy = input(false);
  readonly pending = input(false);

  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly toggleCompleted = output<void>();
  readonly moveColumn = output<string>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  protected readonly columnIds = computed(() => this.columns().map(({ id }) => id));
  protected readonly stringifyColumn = (id: string): string =>
    this.columns().find((column) => column.id === id)?.title ?? id;

  protected selectColumn(event: Event): void {
    this.moveColumn.emit((event.target as HTMLSelectElement).value);
  }

  protected selectColumnId(columnId: string): void {
    this.moveColumn.emit(columnId);
  }
}
