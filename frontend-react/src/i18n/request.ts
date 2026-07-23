import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultTimeZone } from './config';

export type Locale = 'en' | 'ru';
export const locales: Locale[] = ['en', 'ru'];
export const defaultLocale: Locale = 'ru';

async function detectLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') ?? '';
  const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
  if (locales.includes(preferred as Locale)) {
    return preferred as Locale;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();

  return {
    locale,
    timeZone: defaultTimeZone,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
