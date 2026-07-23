import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-workspace-settings-placeholder-page',
  imports: [EmptyState, TranslocoPipe],
  templateUrl: './workspace-settings-placeholder-page.html',
  styleUrl: './workspace-settings-placeholder-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsPlaceholderPage {}
