import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { WorkspaceResponseDto } from '@core/api/generated';
import { WorkspaceCreateDialog } from '@features/workspaces/workspace-create-dialog/workspace-create-dialog';
import {
  WorkspaceDeleteDialog,
  WorkspaceDeleteResult,
} from '@features/workspaces/workspace-delete-dialog/workspace-delete-dialog';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-workspace-catalog-page',
  imports: [AppButton, EmptyState, ErrorState, LoadingSkeleton, TranslocoPipe],
  templateUrl: './workspace-catalog-page.html',
  styleUrl: './workspace-catalog-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceCatalogPage implements OnInit {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  protected readonly store = inject(WorkspaceStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected async openCreateDialog(): Promise<void> {
    const workspace = await firstValueFrom(
      this.dialog.open<WorkspaceResponseDto>(WorkspaceCreateDialog, {
        ariaLabelledBy: 'workspace-create-title',
      }).closed,
    );

    if (workspace) {
      await this.router.navigate(['/workspaces', workspace.id, 'boards']);
    }
  }

  protected async openDeleteDialog(
    event: MouseEvent,
    workspace: WorkspaceResponseDto,
  ): Promise<void> {
    event.stopPropagation();
    const result = await firstValueFrom(
      this.dialog.open<WorkspaceDeleteResult, WorkspaceResponseDto>(WorkspaceDeleteDialog, {
        ariaLabelledBy: 'workspace-delete-title',
        data: workspace,
      }).closed,
    );

    if (result) await this.store.load(true);
  }

  protected async openWorkspace(workspace: WorkspaceResponseDto): Promise<void> {
    try {
      await this.store.switchActive(workspace.id);
      await this.router.navigate(['/workspaces', workspace.id, 'boards']);
    } catch {}
  }

  protected retry(): void {
    void this.store.load(true);
  }
}
