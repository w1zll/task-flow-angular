import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { WorkspaceResponseDto } from '@core/api/generated';

@Component({
  selector: 'app-workspace-switcher',
  imports: [TranslocoPipe],
  templateUrl: './workspace-switcher.html',
  styleUrl: './workspace-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSwitcher {
  readonly workspaces = input.required<readonly WorkspaceResponseDto[]>();
  readonly activeId = input<string | null>(null);
  readonly selected = output<string>();

  protected selectWorkspace(event: Event): void {
    const workspaceId = (event.target as HTMLSelectElement).value;
    if (workspaceId) this.selected.emit(workspaceId);
  }
}
