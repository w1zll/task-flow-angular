import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ApiError, ApiErrorKind } from '@core/api/api-error';

interface ErrorPayload {
  readonly code?: unknown;
}

const errorKind = (status: number): ApiErrorKind => {
  if (status === 0) return 'network';
  if (status >= 200 && status < 300) return 'unexpected-response';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';

  return 'unknown';
};

const errorCode = (error: HttpErrorResponse): string => {
  const payload = error.error as ErrorPayload | null;

  return typeof payload?.code === 'string' && payload.code.length <= 80
    ? payload.code
    : `http_${error.status || 0}`;
};

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const kind = errorKind(error.status);
      const normalized = new ApiError(
        kind,
        error.status,
        errorCode(error),
        kind === 'network' || kind === 'server' || kind === 'unexpected-response',
      );

      return throwError(() => normalized);
    }),
  );
};
