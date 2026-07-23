import type { Request } from 'express';

export type AppLocale = 'en' | 'ru';

const SUPPORTED_LOCALES: AppLocale[] = ['en', 'ru'];
const DEFAULT_LOCALE: AppLocale = 'en';

const normalizeLocale = (locale?: string): AppLocale | null => {
  const normalized = locale?.trim().toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(normalized as AppLocale)
    ? (normalized as AppLocale)
    : null;
};

export const detectRequestLocale = (req: Request): AppLocale => {
  const cookieLocale = normalizeLocale(req.cookies?.locale);
  if (cookieLocale) return cookieLocale;

  const acceptLanguage = req.headers['accept-language'];
  const preferredLanguages =
    typeof acceptLanguage === 'string'
      ? acceptLanguage.split(',').map((part) => part.split(';')[0])
      : [];

  for (const language of preferredLanguages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
};
