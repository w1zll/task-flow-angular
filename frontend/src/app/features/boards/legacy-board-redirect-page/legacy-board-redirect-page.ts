import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-legacy-board-redirect-page',
  imports: [ErrorState, LoadingSkeleton, TranslocoPipe],
  templateUrl: './legacy-board-redirect-page.html',
  styleUrl: './legacy-board-redirect-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegacyBoardRedirectPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(BoardCatalogStore);

  protected readonly errorKey = signal<string | null>(null);
  protected readonly boardId = this.route.snapshot.paramMap.get('boardId') ?? '';

  ngOnInit(): void {
    void this.redirect();
  }

  protected retry(): void {
    void this.redirect(true);
  }

  private async redirect(force = false): Promise<void> {
    this.errorKey.set(null);
    try {
      const board = await this.store.detail(this.boardId, force);
      await this.router.navigate(['/workspaces', board.workspaceId, 'boards', board.id], {
        replaceUrl: true,
      });
    } catch (error) {
      this.errorKey.set(this.store.errorFor(error));
    }
  }
}
