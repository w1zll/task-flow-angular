import { Injectable, inject } from '@angular/core';

import {
  Api,
  TasksControllerCreate$Params,
  TasksControllerMove$Params,
  TasksControllerRemove$Params,
  TasksControllerReorder$Params,
  TasksControllerUpdate$Params,
  tasksControllerCreate,
  tasksControllerMove,
  tasksControllerRemove,
  tasksControllerReorder,
  tasksControllerUpdate,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class TasksApi {
  private readonly api = inject(Api);

  create(params: TasksControllerCreate$Params) {
    return this.api.invoke(tasksControllerCreate, params);
  }

  update(params: TasksControllerUpdate$Params) {
    return this.api.invoke(tasksControllerUpdate, params);
  }

  remove(params: TasksControllerRemove$Params) {
    return this.api.invoke(tasksControllerRemove, params);
  }

  move(params: TasksControllerMove$Params) {
    return this.api.invoke(tasksControllerMove, params);
  }

  reorder(params: TasksControllerReorder$Params) {
    return this.api.invoke(tasksControllerReorder, params);
  }
}
