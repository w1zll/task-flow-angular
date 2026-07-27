import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
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
  imports: [AppButton, EmptyState, ErrorState, LoadingSkeleton, TranslocoPipe, TuiButton],
  templateUrl: './workspace-catalog-page.html',
  styleUrl: './workspace-catalog-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceCatalogPage implements OnInit {
  private readonly dialog = inject(TuiDialogService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  protected readonly store = inject(WorkspaceStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected async openCreateDialog(): Promise<void> {
    const workspace = await firstValueFrom(
      this.dialog.open<WorkspaceResponseDto | undefined>(
        new PolymorpheusComponent(WorkspaceCreateDialog),
        {
          closable: false,
          label: this.transloco.translate('workspaces.create.title'),
          size: 's',
        },
      ),
      { defaultValue: undefined },
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
      this.dialog.open<WorkspaceDeleteResult | undefined>(
        new PolymorpheusComponent(WorkspaceDeleteDialog),
        {
          closable: false,
          data: workspace,
          label: this.transloco.translate('workspaces.delete.title'),
          size: 's',
        },
      ),
      { defaultValue: undefined },
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
