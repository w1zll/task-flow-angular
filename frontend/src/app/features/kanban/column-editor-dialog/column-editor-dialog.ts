import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext, TuiInput } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

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
  imports: [AppButton, ReactiveFormsModule, TranslocoPipe, TuiInput],
  templateUrl: './column-editor-dialog.html',
  styleUrl: './column-editor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnEditorDialog {
  private readonly dialog =
    inject<TuiDialogContext<BoardResponseDto | undefined, ColumnEditorDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly data = this.dialog.data;
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
      const mutation =
        this.data.mode === 'create'
          ? this.store.createColumn(this.data.board, title)
          : this.store.renameColumn(this.data.board.id, this.data.column.id, title);
      this.dialog.completeWith(undefined);
      await mutation;
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
