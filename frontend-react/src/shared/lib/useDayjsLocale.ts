import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useLocale } from 'next-intl';
import { useLayoutEffect } from 'react';

export function useDayjsLocale() {
  const locale = useLocale();
  const dayjsLocale = locale === 'ru' ? 'ru' : 'en';

  useLayoutEffect(() => {
    dayjs.locale(dayjsLocale);
  }, [dayjsLocale]);

  return dayjsLocale;
}
