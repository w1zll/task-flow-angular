import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideTaiga } from '@taiga-ui/core';

import { TranslocoHttpLoader } from '@core/i18n/transloco-loader';
import { apiErrorInterceptor } from '@core/api/interceptors/api-error-interceptor';
import { authRefreshInterceptor } from '@core/api/interceptors/auth-refresh-interceptor';
import { credentialsInterceptor } from '@core/api/interceptors/credentials-interceptor';
import { environment } from '@env/environment';
import { routes } from './app.routes';

const isApiRequest = (url: string): boolean => {
  const path = url.replace(/^https?:\/\/[^/]+/u, '');

  return path === '/api' || path.startsWith('/api/');
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideTaiga({
      scrollbars: 'native',
    }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, apiErrorInterceptor, authRefreshInterceptor]),
    ),
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
