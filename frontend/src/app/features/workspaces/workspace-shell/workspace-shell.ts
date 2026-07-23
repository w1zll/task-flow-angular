import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { WorkspaceSwitcher } from '@features/workspaces/workspace-switcher/workspace-switcher';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-workspace-shell',
  imports: [
    ErrorState,
    LoadingSkeleton,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
    WorkspaceSwitcher,
  ],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceShell implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(WorkspaceStore);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly workspaceId = computed(() => this.paramMap().get('workspaceId') ?? '');
  protected readonly workspace = computed(() =>
    this.store.workspaces().find((workspace) => workspace.id === this.workspaceId()),
  );
  protected readonly workspaceBoards = computed(() => this.store.boardsFor(this.workspaceId()));
  protected readonly drawerOpen = signal(false);

  ngOnInit(): void {
    void this.initialize();
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected async selectWorkspace(workspaceId: string): Promise<void> {
    try {
      await this.store.switchActive(workspaceId);
      this.closeDrawer();
      await this.router.navigate(['/workspaces', workspaceId, 'boards']);
    } catch {}
  }

  protected retry(): void {
    void this.store.load(true);
  }

  protected goToCatalog(): void {
    void this.router.navigate(['/workspaces']);
  }

  private async initialize(): Promise<void> {
    await this.store.load();
    const workspace = this.workspace();

    if (workspace && !workspace.isActive) {
      try {
        await this.store.switchActive(workspace.id);
      } catch {}
    }
  }
}
