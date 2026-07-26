import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { BoardResponseDto, ColumnResponseDto } from '@core/api/generated';
import { KanbanStore } from '@features/kanban/kanban.store';
import { AppButton } from '@shared/ui/app-button/app-button';

export type ColumnEditorDialogData =
  | { readonly mode: 'create'; readonly board: BoardResponseDto }
  | {
      readonly mode: 'rename';
      readonly board: BoardResponseDto;
      readonly column: ColumnResponseDto;
    };

@Component({
  selector: 'app-column-editor-dialog',
  imports: [AppButton, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './column-editor-dialog.html',
  styleUrl: './column-editor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnEditorDialog {
  protected readonly data = inject<ColumnEditorDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<BoardResponseDto>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(KanbanStore);

  protected readonly isCreate = this.data.mode === 'create';
  protected readonly form = this.formBuilder.nonNullable.group({
    title: [
      this.data.mode === 'rename' ? this.data.column.title : '',
      [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/u)],
    ],
  });
  protected readonly busy = computed(() => this.store.busyId() !== null);

  protected async submit(): Promise<void> {
    this.store.clearError();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      const title = this.form.controls.title.value.trim();
      const board =
        this.data.mode === 'create'
          ? await this.store.createColumn(this.data.board, title)
          : await this.store.renameColumn(this.data.board.id, this.data.column.id, title);
      this.dialogRef.close(board);
    } catch {}
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
