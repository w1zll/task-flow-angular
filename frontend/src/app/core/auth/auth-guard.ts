import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';

import { AuthStore } from '@core/auth/auth.store';
import { safeNextUrl } from '@core/auth/auth-route';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return from(auth.bootstrap()).pipe(
    map(() => {
      if (auth.isAuthenticated()) return true;

      const next = safeNextUrl(state.url);

      return router.createUrlTree(['/auth/login'], {
        queryParams: next ? { next } : undefined,
      });
    }),
  );
};
