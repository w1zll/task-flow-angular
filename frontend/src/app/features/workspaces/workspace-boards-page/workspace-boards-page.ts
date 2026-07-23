import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-workspace-boards-page',
  imports: [EmptyState, TranslocoPipe],
  templateUrl: './workspace-boards-page.html',
  styleUrl: './workspace-boards-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceBoardsPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(WorkspaceStore);
  private readonly parentParamMap = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });

  protected readonly workspaceId = computed(() => this.parentParamMap().get('workspaceId') ?? '');
  protected readonly boards = computed(() => this.store.boardsFor(this.workspaceId()));
}
