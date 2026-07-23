import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

const isApiRequest = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/u, '');

  return path === '/api' || path.startsWith('/api/');
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (request) => !isApiRequest(request.url),
      }),
    ),
  ],
};
