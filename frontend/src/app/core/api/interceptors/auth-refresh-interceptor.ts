import {
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

const excludedPaths = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/health',
]);

let refreshRequest$: Observable<unknown> | null = null;

const requestPath = (url: string): string => {
  const withoutOrigin = url.replace(/^https?:\/\/[^/]+/u, '');

  return withoutOrigin.split('?')[0] ?? withoutOrigin;
};

export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const http = inject(HttpClient);
  const path = requestPath(request.url);

  if (request.context.get(SKIP_AUTH_REFRESH) || excludedPaths.has(path)) {
    return next(request);
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      refreshRequest$ ??= http
        .post('/api/auth/refresh', null, {
          context: request.context.set(SKIP_AUTH_REFRESH, true),
          withCredentials: true,
        })
        .pipe(
          finalize(() => {
            refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );

      return refreshRequest$.pipe(
        switchMap(() =>
          next(
            request.clone({
              context: request.context.set(SKIP_AUTH_REFRESH, true),
            }),
          ),
        ),
      );
    }),
  );
};
