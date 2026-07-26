import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { BoardResponseDto } from '@core/api/generated';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-board-detail-page',
  imports: [ErrorState, LoadingSkeleton, RouterLink, TranslocoPipe],
  templateUrl: './board-detail-page.html',
  styleUrl: './board-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(BoardCatalogStore);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly parentParamMap = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });

  protected readonly boardId = computed(() => this.paramMap().get('boardId') ?? '');
  protected readonly workspaceId = computed(() => this.parentParamMap().get('workspaceId') ?? '');
  protected readonly board = signal<BoardResponseDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorKey = signal<string | null>(null);
  private loadEpoch = 0;

  constructor() {
    effect(() => {
      const boardId = this.boardId();
      const workspaceId = this.workspaceId();
      if (boardId && workspaceId) void this.load(boardId, workspaceId);
    });
  }

  protected retry(): void {
    const boardId = this.boardId();
    const workspaceId = this.workspaceId();
    if (boardId && workspaceId) void this.load(boardId, workspaceId, true);
  }

  private async load(boardId: string, workspaceId: string, force = false): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.loading.set(true);
    this.errorKey.set(null);

    try {
      const board = await this.store.detail(boardId, force);
      if (epoch !== this.loadEpoch) return;
      if (board.workspaceId !== workspaceId) {
        await this.router.navigate(['/workspaces', board.workspaceId, 'boards', board.id], {
          replaceUrl: true,
        });
        return;
      }
      this.board.set(board);
    } catch (error) {
      if (epoch !== this.loadEpoch) return;
      this.board.set(null);
      this.errorKey.set(this.store.errorFor(error));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }
}
