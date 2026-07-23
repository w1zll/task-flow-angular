import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslocoLoader, Translation } from '@jsverse/transloco';
import { Observable } from 'rxjs';

import { DEFAULT_LANGUAGE, isLanguage } from '@core/i18n/locale';

@Injectable({
  providedIn: 'root',
})
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(language: string): Observable<Translation> {
    const safeLanguage = isLanguage(language) ? language : DEFAULT_LANGUAGE;

    return this.http.get<Translation>(`/i18n/${safeLanguage}.json`);
  }
}
