import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TranslocoPipe } from '@jsverse/transloco';

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
  protected readonly workspace = inject<WorkspaceResponseDto>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<WorkspaceDeleteResult>);
  protected readonly store = inject(WorkspaceStore);

  protected async confirm(): Promise<void> {
    this.store.clearMutationError();

    try {
      const fallbackId = await this.store.remove(this.workspace.id);
      this.dialogRef.close({
        deletedId: this.workspace.id,
        fallbackId,
      });
    } catch {}
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
