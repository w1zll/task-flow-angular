import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { WorkspaceResponseDto } from '@core/api/generated';
import { AppButton } from '@shared/ui/app-button/app-button';
import { WorkspaceStore } from '@features/workspaces/workspace.store';

export interface WorkspaceDeleteResult {
  readonly deletedId: string;
  readonly fallbackId: string | null;
}

@Component({
  selector: 'app-workspace-delete-dialog',
  imports: [AppButton, TranslocoPipe],
  templateUrl: './workspace-delete-dialog.html',
  styleUrl: './workspace-delete-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDeleteDialog {
  private readonly dialog =
    inject<TuiDialogContext<WorkspaceDeleteResult | undefined, WorkspaceResponseDto>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly workspace = this.dialog.data;
  protected readonly store = inject(WorkspaceStore);

  protected async confirm(): Promise<void> {
    this.store.clearMutationError();

    try {
      const fallbackId = await this.store.remove(this.workspace.id);
      this.dialog.completeWith({
        deletedId: this.workspace.id,
        fallbackId,
      });
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
