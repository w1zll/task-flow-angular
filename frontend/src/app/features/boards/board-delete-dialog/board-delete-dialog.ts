import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

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
  private readonly dialog =
    inject<TuiDialogContext<boolean, BoardResponseDto>>(POLYMORPHEUS_CONTEXT);
  protected readonly board = this.dialog.data;
  protected readonly store = inject(BoardCatalogStore);

  protected async confirm(): Promise<void> {
    this.store.clearError();
    try {
      await this.store.remove(this.board.id);
      this.dialog.completeWith(true);
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(false);
  }
}
