import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';

import { TranslocoHttpLoader } from '@core/i18n/transloco-loader';
import { environment } from '@env/environment';
import { routes } from './app.routes';

const isApiRequest = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/u, '');

  return path === '/api' || path.startsWith('/api/');
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideTransloco({
      config: {
        availableLangs: ['ru', 'en'],
        defaultLang: 'ru',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production,
        missingHandler: {
          logMissingKey: !environment.production,
          useFallbackTranslation: true,
        },
      },
      loader: TranslocoHttpLoader,
    }),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (request) => !isApiRequest(request.url),
      }),
    ),
  ],
};
