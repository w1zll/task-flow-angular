import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map } from 'rxjs';

import { postAuthUrl } from '@core/auth/auth-route';
import { AuthStore } from '@core/auth/auth.store';

export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return from(auth.bootstrap()).pipe(
    map(() => {
      const user = auth.user();
      if (!user) return true;

      return router.parseUrl(postAuthUrl(user, route.queryParamMap.get('next')));
    }),
  );
};
