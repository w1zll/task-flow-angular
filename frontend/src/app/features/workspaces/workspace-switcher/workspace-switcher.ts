import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiSelect } from '@taiga-ui/kit';

import { WorkspaceResponseDto } from '@core/api/generated';

@Component({
  selector: 'app-workspace-switcher',
  imports: [FormsModule, TranslocoPipe, TuiSelect],
  templateUrl: './workspace-switcher.html',
  styleUrl: './workspace-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSwitcher {
  readonly workspaces = input.required<readonly WorkspaceResponseDto[]>();
  readonly activeId = input<string | null>(null);
  readonly selected = output<string>();
  private readonly transloco = inject(TranslocoService);
  protected readonly workspaceIds = computed(() => this.workspaces().map(({ id }) => id));
  protected readonly stringifyWorkspace = (id: string): string => {
    const workspace = this.workspaces().find((item) => item.id === id);

    return workspace
      ? `${workspace.name}${workspace.isPersonal ? ` (${this.transloco.translate('workspaces.personal')})` : ''}`
      : id;
  };

  protected selectWorkspace(event: Event): void {
    const workspaceId = (event.target as HTMLSelectElement).value;
    if (workspaceId) this.selected.emit(workspaceId);
  }

  protected selectWorkspaceId(workspaceId: string): void {
    if (workspaceId) this.selected.emit(workspaceId);
  }
}
