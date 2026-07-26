import { Injectable, inject } from '@angular/core';

import { UserDto } from '@core/api/generated';
import { postAuthUrl } from '@core/auth/auth-route';
import { PendingWorkspaceInviteService } from '@core/invites/pending-workspace-invite.service';
import { WorkspaceStore } from '@features/workspaces/workspace.store';

@Injectable({ providedIn: 'root' })
export class AuthenticationCompletionService {
  private readonly pendingInvite = inject(PendingWorkspaceInviteService);
  private readonly workspaces = inject(WorkspaceStore);

  async finishAuthentication(user: UserDto, next?: string | null): Promise<string> {
    const pendingToken = this.pendingInvite.peek();
    if (!pendingToken) return postAuthUrl(user, next);

    try {
      const workspace = await this.pendingInvite.accept(pendingToken);
      if (workspace) {
        this.workspaces.integrateAcceptedWorkspace(workspace);
        return `/workspaces/${encodeURIComponent(workspace.id)}/boards`;
      }
    } catch {
      return `/invite/${encodeURIComponent(pendingToken)}`;
    }

    return postAuthUrl(user, next);
  }
}
