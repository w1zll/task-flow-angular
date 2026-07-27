import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext, TuiInput, TuiRadio, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { BoardResponseDto } from '@core/api/generated';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import { AppButton } from '@shared/ui/app-button/app-button';

export type BoardUpsertDialogData =
  | { readonly mode: 'create'; readonly workspaceId: string }
  | { readonly mode: 'edit'; readonly board: BoardResponseDto };

@Component({
  selector: 'app-board-upsert-dialog',
  imports: [
    AppButton,
    ReactiveFormsModule,
    TranslocoPipe,
    TuiInput,
    TuiRadio,
    TuiTextarea,
    TuiTextfield,
  ],
  templateUrl: './board-upsert-dialog.html',
  styleUrl: './board-upsert-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardUpsertDialog {
  private readonly dialog =
    inject<TuiDialogContext<BoardResponseDto | undefined, BoardUpsertDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly data = this.dialog.data;
  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(BoardCatalogStore);

  protected readonly isCreate = this.data.mode === 'create';
  protected readonly titleKey = this.isCreate ? 'boards.create.title' : 'boards.edit.title';
  protected readonly form = this.formBuilder.nonNullable.group({
    title: [
      this.data.mode === 'edit' ? this.data.board.title : '',
      [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/u)],
    ],
    description: [
      this.data.mode === 'edit' ? (this.data.board.description ?? '') : '',
      [Validators.maxLength(2000)],
    ],
    color: [
      this.data.mode === 'edit' ? (this.data.board.color ?? '#669266') : '#669266',
      [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/u)],
    ],
    template: ['empty' as 'empty' | 'scrum'],
  });
  protected readonly busy = computed(() =>
    this.data.mode === 'create'
      ? this.store.busyId() === 'create'
      : this.store.busyId() === this.data.board.id,
  );

  protected async submit(): Promise<void> {
    this.store.clearError();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    try {
      const board =
        this.data.mode === 'create'
          ? await this.store.create({
              title: value.title.trim(),
              description: value.description.trim() || undefined,
              color: value.color,
              template: value.template,
              workspaceId: this.data.workspaceId,
            })
          : await this.store.update(this.data.board.id, {
              title: value.title.trim(),
              description: value.description.trim(),
              color: value.color,
            });
      this.dialog.completeWith(board);
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
