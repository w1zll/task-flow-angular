import { Injectable, inject } from '@angular/core';

import {
  Api,
  AuthControllerLogin$Params,
  AuthControllerRegister$Json$Params,
  authControllerLogin,
  authControllerLogout,
  authControllerMe,
  authControllerProviders,
  authControllerRefresh,
  authControllerRegister$Json,
  authControllerWsToken,
} from '@core/api/generated';

@Injectable({
  providedIn: 'root',
})
export class AuthApi {
  private readonly api = inject(Api);

  register(params: AuthControllerRegister$Json$Params) {
    return this.api.invoke(authControllerRegister$Json, params);
  }

  login(params: AuthControllerLogin$Params) {
    return this.api.invoke(authControllerLogin, params);
  }

  refresh() {
    return this.api.invoke(authControllerRefresh);
  }

  logout() {
    return this.api.invoke(authControllerLogout);
  }

  me() {
    return this.api.invoke(authControllerMe);
  }

  providers() {
    return this.api.invoke(authControllerProviders);
  }

  websocketToken() {
    return this.api.invoke(authControllerWsToken);
  }
}
