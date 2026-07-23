export type OfflineDocumentLocale = 'en' | 'ru';

export const DEFAULT_OFFLINE_DOCUMENT_LOCALE: OfflineDocumentLocale = 'ru';

const copy = {
  en: {
    title: 'TaskFlow is offline',
    description:
      'This page has not been saved yet. Connect once and open the workspace or board to make it available offline.',
    retry: 'Try again',
    home: 'My workspaces',
  },
  ru: {
    title: 'TaskFlow не в сети',
    description:
      'Эта страница ещё не сохранена. Подключитесь к интернету и откройте пространство или доску, чтобы они стали доступны офлайн.',
    retry: 'Повторить',
    home: 'Мои пространства',
  },
} satisfies Record<OfflineDocumentLocale, Record<string, string>>;

export const parseOfflineDocumentLocale = (
  value: unknown,
): OfflineDocumentLocale | undefined =>
  value === 'en' || value === 'ru' ? value : undefined;

export const getOfflineLocaleFromCookieHeader = (cookieHeader: string) => {
  const match = cookieHeader.match(/(?:^|;\s*)locale=(en|ru)(?:;|$)/i);
  return parseOfflineDocumentLocale(match?.[1]?.toLowerCase());
};

export const getOfflineLocaleFromAcceptLanguage = (
  acceptLanguage: string,
) => {
  const preferred = acceptLanguage
    .split(',')[0]
    ?.trim()
    .split('-')[0]
    ?.toLowerCase();
  return parseOfflineDocumentLocale(preferred);
};

export const getOfflineLocaleFromHtml = (html: string) => {
  const match = html.match(/<html[^>]*\blang=["'](en|ru)(?:-[^"']*)?["']/i);
  return parseOfflineDocumentLocale(match?.[1]?.toLowerCase());
};

export const createOfflineDocumentHtml = ({
  locale,
  showWorkspacesLink,
}: {
  locale: OfflineDocumentLocale;
  showWorkspacesLink: boolean;
}) => {
  const text = copy[locale];
  const workspacesLink = showWorkspacesLink
    ? `<a class="button button-secondary" href="/workspaces">${text.home}</a>`
    : '';

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#669266" />
    <title>${text.title}</title>
    <style>
      :root { color-scheme: dark light; font-family: Inter, system-ui, sans-serif; }
      body { align-items: center; background: #101510; color: #f4f7f4; display: flex; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
      main { margin: 0 auto; max-width: 480px; }
      img { height: 72px; margin-bottom: 24px; width: 72px; }
      h1 { font-size: 24px; line-height: 1.2; margin: 0 0 12px; }
      p { color: #cbd5cb; font-size: 16px; line-height: 1.5; margin: 0; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 24px; }
      .button { align-items: center; background: #669266; border: 1px solid #669266; border-radius: 8px; color: #fff; cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 42px; padding: 9px 18px; text-decoration: none; }
      .button:hover { background: #74a574; border-color: #74a574; }
      .button-secondary { background: transparent; color: #a8d0a8; }
      .button-secondary:hover { background: rgba(102, 146, 102, 0.16); border-color: #74a574; }
    </style>
  </head>
  <body>
    <main>
      <img src="/icons/taskflow-icon-192.png" alt="" />
      <h1>${text.title}</h1>
      <p>${text.description}</p>
      <div class="actions">
        <button class="button" type="button" onclick="window.location.reload()">${text.retry}</button>
        ${workspacesLink}
      </div>
    </main>
  </body>
</html>`;
};
