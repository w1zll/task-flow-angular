import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { BoardResponseDto, ColumnResponseDto, TaskResponseDto } from '@core/api/generated';
import { KanbanStore } from '@features/kanban/kanban.store';
import { AppButton } from '@shared/ui/app-button/app-button';

export type DeleteConfirmDialogData =
  | {
      readonly kind: 'column';
      readonly board: BoardResponseDto;
      readonly column: ColumnResponseDto;
    }
  | {
      readonly kind: 'task';
      readonly board: BoardResponseDto;
      readonly task: TaskResponseDto;
    };

@Component({
  selector: 'app-delete-confirm-dialog',
  imports: [AppButton, TranslocoPipe],
  templateUrl: './delete-confirm-dialog.html',
  styleUrl: './delete-confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteConfirmDialog {
  protected readonly data = inject<DeleteConfirmDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<BoardResponseDto>);
  protected readonly store = inject(KanbanStore);

  protected readonly busy = computed(() => this.store.busyId() !== null);
  protected readonly title =
    this.data.kind === 'column' ? this.data.column.title : this.data.task.title;
  protected readonly taskCount =
    this.data.kind === 'column' ? (this.data.column.tasks?.length ?? 0) : 0;

  protected async confirm(): Promise<void> {
    this.store.clearError();
    try {
      const mutation =
        this.data.kind === 'column'
          ? this.store.removeColumn(this.data.board.id, this.data.column.id)
          : this.store.removeTask(this.data.board.id, this.data.task.id);
      this.dialogRef.close();
      await mutation;
    } catch {}
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
