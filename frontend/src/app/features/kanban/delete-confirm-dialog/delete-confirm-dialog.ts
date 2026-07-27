import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

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
  private readonly dialog =
    inject<TuiDialogContext<BoardResponseDto | undefined, DeleteConfirmDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly data = this.dialog.data;
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
      this.dialog.completeWith(undefined);
      await mutation;
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
