import { Injectable, inject } from '@angular/core';

import {
  Api,
  BoardsControllerCheckAccess$Params,
  BoardsControllerCreate$Params,
  BoardsControllerFindOne$Params,
  BoardsControllerRemove$Params,
  BoardsControllerUpdate$Params,
  boardsControllerCheckAccess,
  boardsControllerCreate,
  boardsControllerFindAll,
  boardsControllerFindOne,
  boardsControllerRemove,
  boardsControllerUpdate,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class BoardsApi {
  private readonly api = inject(Api);

  list() {
    return this.api.invoke(boardsControllerFindAll);
  }

  create(params: BoardsControllerCreate$Params) {
    return this.api.invoke(boardsControllerCreate, params);
  }

  detail(params: BoardsControllerFindOne$Params) {
    return this.api.invoke(boardsControllerFindOne, params);
  }

  update(params: BoardsControllerUpdate$Params) {
    return this.api.invoke(boardsControllerUpdate, params);
  }

  remove(params: BoardsControllerRemove$Params) {
    return this.api.invoke(boardsControllerRemove, params);
  }

  access(params: BoardsControllerCheckAccess$Params) {
    return this.api.invoke(boardsControllerCheckAccess, params);
  }
}
