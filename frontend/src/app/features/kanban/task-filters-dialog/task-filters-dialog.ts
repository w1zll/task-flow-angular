import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import {
  TaskFilterAssignee,
  TaskFilterState,
} from '@features/kanban/task-filters/task-filter.model';
import { TaskFilters } from '@features/kanban/task-filters/task-filters';
import { AppButton } from '@shared/ui/app-button/app-button';

export interface TaskFiltersDialogData {
  readonly filters: TaskFilterState;
  readonly assignees: readonly TaskFilterAssignee[];
  readonly labels: readonly string[];
}

@Component({
  selector: 'app-task-filters-dialog',
  imports: [AppButton, TaskFilters, TranslocoPipe],
  templateUrl: './task-filters-dialog.html',
  styleUrl: './task-filters-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersDialog {
  private readonly dialog =
    inject<TuiDialogContext<TaskFilterState | undefined, TaskFiltersDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly data = this.dialog.data;
  protected readonly draft = signal(this.data.filters);

  protected apply(): void {
    this.dialog.completeWith(this.draft());
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
