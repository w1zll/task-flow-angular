import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import { BoardResponseDto } from '@core/api/generated';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import { BoardDeleteDialog } from '@features/boards/board-delete-dialog/board-delete-dialog';
import {
  BoardUpsertDialog,
  BoardUpsertDialogData,
} from '@features/boards/board-upsert-dialog/board-upsert-dialog';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-workspace-boards-page',
  imports: [AppButton, EmptyState, ErrorState, LoadingSkeleton, TranslocoPipe, TuiButton],
  templateUrl: './workspace-boards-page.html',
  styleUrl: './workspace-boards-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceBoardsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(TuiDialogService);
  private readonly transloco = inject(TranslocoService);
  protected readonly store = inject(WorkspaceStore);
  protected readonly boardStore = inject(BoardCatalogStore);
  private readonly parentParamMap = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });

  protected readonly workspaceId = computed(() => this.parentParamMap().get('workspaceId') ?? '');
  protected readonly boards = computed(() => this.store.boardsFor(this.workspaceId()));

  protected async openCreateDialog(): Promise<void> {
    this.boardStore.clearError();
    const board = await firstValueFrom(
      this.dialog.open<BoardResponseDto | undefined>(new PolymorpheusComponent(BoardUpsertDialog), {
        closable: false,
        data: { mode: 'create', workspaceId: this.workspaceId() } satisfies BoardUpsertDialogData,
        label: this.transloco.translate('boards.create.title'),
        size: 's',
      }),
      { defaultValue: undefined },
    );
    if (board) await this.openBoard(board);
  }

  protected async openEditDialog(event: MouseEvent, board: BoardResponseDto): Promise<void> {
    event.stopPropagation();
    if (!board.capabilities.canManageBoardSettings) return;
    this.boardStore.clearError();

    await firstValueFrom(
      this.dialog.open<BoardResponseDto | undefined>(new PolymorpheusComponent(BoardUpsertDialog), {
        closable: false,
        data: { mode: 'edit', board } satisfies BoardUpsertDialogData,
        label: this.transloco.translate('boards.edit.title'),
        size: 's',
      }),
      { defaultValue: undefined },
    );
  }

  protected async openDeleteDialog(event: MouseEvent, board: BoardResponseDto): Promise<void> {
    event.stopPropagation();
    if (!board.capabilities.canDeleteBoard) return;
    this.boardStore.clearError();

    await firstValueFrom(
      this.dialog.open<boolean>(new PolymorpheusComponent(BoardDeleteDialog), {
        closable: false,
        data: board,
        label: this.transloco.translate('boards.delete.title'),
        size: 's',
      }),
      { defaultValue: false },
    );
  }

  protected openBoard(board: BoardResponseDto): Promise<boolean> {
    return this.router.navigate(['/workspaces', board.workspaceId, 'boards', board.id]);
  }

  protected retry(): void {
    void this.store.load(true);
  }
}
