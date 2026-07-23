import { HttpInterceptorFn } from '@angular/common/http';

const isApiRequest = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/u, '');

  return path === '/api' || path.startsWith('/api/');
};

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  return next(request.clone({ withCredentials: true }));
};
