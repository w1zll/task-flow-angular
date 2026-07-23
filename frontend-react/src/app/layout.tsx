import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DM_Sans } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import Providers from './Providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

type ThemeMode = 'light' | 'dark';

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow',
    template: '%s | TaskFlow',
  },
  description: 'Workspace task tracking for teams.',
  applicationName: 'TaskFlow',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'TaskFlow',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#669266',
};

const getInitialThemeMode = async (): Promise<ThemeMode> => {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;

  return theme === 'light' || theme === 'dark' ? theme : 'dark';
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const messages = await getMessages();
  const locale = await getLocale();
  const initialThemeMode = await getInitialThemeMode();
  const initialNow = new Date();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={dmSans.className}>
        <Providers
          messages={messages}
          locale={locale}
          initialThemeMode={initialThemeMode}
          initialNow={initialNow}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
