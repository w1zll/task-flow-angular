import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiDialogContext, TuiInput } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { WorkspaceResponseDto } from '@core/api/generated';
import { AppButton } from '@shared/ui/app-button/app-button';
import { WorkspaceStore } from '@features/workspaces/workspace.store';

@Component({
  selector: 'app-workspace-create-dialog',
  imports: [AppButton, ReactiveFormsModule, TranslocoPipe, TuiInput],
  templateUrl: './workspace-create-dialog.html',
  styleUrl: './workspace-create-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceCreateDialog {
  private readonly dialog =
    inject<TuiDialogContext<WorkspaceResponseDto | undefined>>(POLYMORPHEUS_CONTEXT);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(WorkspaceStore);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  protected async submit(): Promise<void> {
    this.store.clearMutationError();

    if (this.form.invalid || !this.form.controls.name.value.trim()) {
      this.form.controls.name.setErrors({ required: true });
      this.form.controls.name.markAsTouched();
      return;
    }

    try {
      const workspace = await this.store.create(this.form.controls.name.value);
      this.dialog.completeWith(workspace);
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
