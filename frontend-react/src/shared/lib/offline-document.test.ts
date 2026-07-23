import {
  createOfflineDocumentHtml,
  getOfflineLocaleFromAcceptLanguage,
  getOfflineLocaleFromCookieHeader,
  getOfflineLocaleFromHtml,
  parseOfflineDocumentLocale,
} from './offline-document';

describe('offline document', () => {
  it('uses the same locale signals as next-intl request detection', () => {
    expect(getOfflineLocaleFromCookieHeader('theme=dark; locale=en')).toBe(
      'en',
    );
    expect(getOfflineLocaleFromAcceptLanguage('ru-RU,ru;q=0.9')).toBe('ru');
    expect(getOfflineLocaleFromHtml('<html lang="en">')).toBe('en');
    expect(parseOfflineDocumentLocale('de')).toBeUndefined();
  });

  it('renders Russian copy and a cached-workspaces action', () => {
    const html = createOfflineDocumentHtml({
      locale: 'ru',
      showWorkspacesLink: true,
    });

    expect(html).toContain('<html lang="ru">');
    expect(html).toContain('TaskFlow не в сети');
    expect(html).toContain('>Повторить</button>');
    expect(html).toContain('href="/workspaces">Мои пространства</a>');
  });

  it('renders English copy without an unavailable workspaces action', () => {
    const html = createOfflineDocumentHtml({
      locale: 'en',
      showWorkspacesLink: false,
    });

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('TaskFlow is offline');
    expect(html).toContain('>Try again</button>');
    expect(html).not.toContain('href="/workspaces"');
  });
});
