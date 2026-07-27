import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

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
  protected readonly data = inject<TaskFiltersDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<TaskFilterState>);
  protected readonly draft = signal(this.data.filters);

  protected apply(): void {
    this.dialogRef.close(this.draft());
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
