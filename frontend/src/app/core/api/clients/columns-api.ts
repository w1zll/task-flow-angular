import { Injectable, inject } from '@angular/core';

import {
  Api,
  ColumnsControllerCreate$Params,
  ColumnsControllerRemove$Params,
  ColumnsControllerReorder$Params,
  ColumnsControllerUpdate$Params,
  columnsControllerCreate,
  columnsControllerRemove,
  columnsControllerReorder,
  columnsControllerUpdate,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class ColumnsApi {
  private readonly api = inject(Api);

  create(params: ColumnsControllerCreate$Params) {
    return this.api.invoke(columnsControllerCreate, params);
  }

  update(params: ColumnsControllerUpdate$Params) {
    return this.api.invoke(columnsControllerUpdate, params);
  }

  remove(params: ColumnsControllerRemove$Params) {
    return this.api.invoke(columnsControllerRemove, params);
  }

  reorder(params: ColumnsControllerReorder$Params) {
    return this.api.invoke(columnsControllerReorder, params);
  }
}
