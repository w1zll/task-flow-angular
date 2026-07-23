import { Injectable, inject } from '@angular/core';

import {
  Api,
  WorkspaceInvitesControllerAccept$Params,
  WorkspaceInvitesControllerCreate$Params,
  WorkspaceInvitesControllerList$Params,
  WorkspaceInvitesControllerPreview$Params,
  WorkspaceInvitesControllerRevoke$Params,
  workspaceInvitesControllerAccept,
  workspaceInvitesControllerCreate,
  workspaceInvitesControllerList,
  workspaceInvitesControllerPreview,
  workspaceInvitesControllerRevoke,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceInvitesApi {
  private readonly api = inject(Api);

  list(params: WorkspaceInvitesControllerList$Params) {
    return this.api.invoke(workspaceInvitesControllerList, params);
  }

  create(params: WorkspaceInvitesControllerCreate$Params) {
    return this.api.invoke(workspaceInvitesControllerCreate, params);
  }

  revoke(params: WorkspaceInvitesControllerRevoke$Params) {
    return this.api.invoke(workspaceInvitesControllerRevoke, params);
  }

  preview(params: WorkspaceInvitesControllerPreview$Params) {
    return this.api.invoke(workspaceInvitesControllerPreview, params);
  }

  accept(params: WorkspaceInvitesControllerAccept$Params) {
    return this.api.invoke(workspaceInvitesControllerAccept, params);
  }
}
