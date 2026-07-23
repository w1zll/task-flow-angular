import { detectRequestLocale } from './request-locale';

const createRequest = ({
  cookieLocale,
  acceptLanguage,
}: {
  cookieLocale?: string;
  acceptLanguage?: string;
}) =>
  ({
    cookies: cookieLocale ? { locale: cookieLocale } : {},
    headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {},
  }) as any;

describe('detectRequestLocale', () => {
  it('uses locale cookie first', () => {
    expect(
      detectRequestLocale(
        createRequest({ cookieLocale: 'ru', acceptLanguage: 'en-US,en;q=0.9' }),
      ),
    ).toBe('ru');
  });

  it('falls back to Accept-Language', () => {
    expect(
      detectRequestLocale(createRequest({ acceptLanguage: 'ru-RU,ru;q=0.9' })),
    ).toBe('ru');
  });

  it('defaults to English', () => {
    expect(detectRequestLocale(createRequest({}))).toBe('en');
  });
});
