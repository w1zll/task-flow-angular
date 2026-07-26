import { formatDate, registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeRu from '@angular/common/locales/ru';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { LocaleService } from '@core/i18n/locale';

registerLocaleData(localeRu);
registerLocaleData(localeEn);

export type LocalizedDateFormat =
  | 'short'
  | 'medium'
  | 'long'
  | 'full'
  | 'shortDate'
  | 'mediumDate'
  | 'longDate'
  | 'fullDate'
  | 'shortTime'
  | 'mediumTime'
  | 'longTime'
  | 'fullTime'
  | string;

@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: false,
})
export class LocalizedDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(
    value: string | number | Date | null | undefined,
    format: LocalizedDateFormat = 'mediumDate',
    timezone?: string,
  ): string {
    if (value === null || value === undefined || value === '') return '';

    const locale = this.locale.language() === 'ru' ? 'ru-RU' : 'en-US';

    try {
      return formatDate(value, format, locale, timezone);
    } catch {
      return '';
    }
  }
}
