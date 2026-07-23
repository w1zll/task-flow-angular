import { Injectable, inject } from '@angular/core';

import {
  Api,
  BoardsControllerMembers$Params,
  BoardsControllerRevokeMember$Params,
  BoardsControllerShare$Params,
  BoardsControllerUpdateMemberRole$Params,
  boardsControllerMembers,
  boardsControllerRevokeMember,
  boardsControllerShare,
  boardsControllerUpdateMemberRole,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class BoardMembersApi {
  private readonly api = inject(Api);

  list(params: BoardsControllerMembers$Params) {
    return this.api.invoke(boardsControllerMembers, params);
  }

  add(params: BoardsControllerShare$Params) {
    return this.api.invoke(boardsControllerShare, params);
  }

  updateRole(params: BoardsControllerUpdateMemberRole$Params) {
    return this.api.invoke(boardsControllerUpdateMemberRole, params);
  }

  remove(params: BoardsControllerRevokeMember$Params) {
    return this.api.invoke(boardsControllerRevokeMember, params);
  }
}
