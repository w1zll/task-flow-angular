import { Injectable, inject } from '@angular/core';

import {
  Api,
  WorkspacesControllerCreate$Params,
  WorkspacesControllerMembers$Params,
  WorkspacesControllerRemove$Params,
  WorkspacesControllerRemoveMember$Params,
  WorkspacesControllerSwitchActive$Params,
  WorkspacesControllerUpdateMemberRole$Params,
  workspacesControllerCreate,
  workspacesControllerFindAll,
  workspacesControllerMembers,
  workspacesControllerRemove,
  workspacesControllerRemoveMember,
  workspacesControllerSwitchActive,
  workspacesControllerUpdateMemberRole,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class WorkspacesApi {
  private readonly api = inject(Api);

  list() {
    return this.api.invoke(workspacesControllerFindAll);
  }

  create(params: WorkspacesControllerCreate$Params) {
    return this.api.invoke(workspacesControllerCreate, params);
  }

  switchActive(params: WorkspacesControllerSwitchActive$Params) {
    return this.api.invoke(workspacesControllerSwitchActive, params);
  }

  members(params: WorkspacesControllerMembers$Params) {
    return this.api.invoke(workspacesControllerMembers, params);
  }

  updateMemberRole(params: WorkspacesControllerUpdateMemberRole$Params) {
    return this.api.invoke(workspacesControllerUpdateMemberRole, params);
  }

  removeMember(params: WorkspacesControllerRemoveMember$Params) {
    return this.api.invoke(workspacesControllerRemoveMember, params);
  }

  remove(params: WorkspacesControllerRemove$Params) {
    return this.api.invoke(workspacesControllerRemove, params);
  }
}
