import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { BoardResponseDto } from '@core/api/generated';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import { AppButton } from '@shared/ui/app-button/app-button';

@Component({
  selector: 'app-board-delete-dialog',
  imports: [AppButton, TranslocoPipe],
  templateUrl: './board-delete-dialog.html',
  styleUrl: './board-delete-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDeleteDialog {
  protected readonly board = inject<BoardResponseDto>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<boolean>);
  protected readonly store = inject(BoardCatalogStore);

  protected async confirm(): Promise<void> {
    this.store.clearError();
    try {
      await this.store.remove(this.board.id);
      this.dialogRef.close(true);
    } catch {}
  }

  protected close(): void {
    this.dialogRef.close(false);
  }
}
