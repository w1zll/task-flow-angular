import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

const isApiRequest = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/u, '');

  return path === '/api' || path.startsWith('/api/');
};

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const document = inject(DOCUMENT);

  if (!isApiRequest(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      cache: 'no-store',
      withCredentials: true,
      setHeaders: {
        'Accept-Language': document.documentElement.lang || 'ru',
      },
    }),
  );
};
