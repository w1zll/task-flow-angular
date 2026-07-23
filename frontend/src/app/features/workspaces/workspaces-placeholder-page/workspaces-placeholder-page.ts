import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-workspaces-placeholder-page',
  imports: [EmptyState, TranslocoPipe],
  templateUrl: './workspaces-placeholder-page.html',
  styleUrl: './workspaces-placeholder-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacesPlaceholderPage {}
