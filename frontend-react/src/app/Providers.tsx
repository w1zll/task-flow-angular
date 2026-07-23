'use client';

import AuthHydrator from '@/features/auth/AuthHydrator';
import { defaultTimeZone } from '@/i18n/config';
import PendingBoardMutationsPrompt from '@/shared/ui/PendingBoardMutationsPrompt';
import OfflineRuntime from '@/shared/ui/OfflineRuntime';
import RouteProgressBar from '@/shared/ui/RouteProgressBar';
import OfflineNavigationGuard from '@/shared/ui/OfflineNavigationGuard';
import OfflineNavigationOutlet from '@/shared/ui/OfflineNavigationOutlet';
import BackendWakeupRuntime from '@/shared/ui/BackendWakeupRuntime';
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  queryCachePersister,
  shouldPersistQuery,
} from '@/shared/lib/query-persistence';
import { useThemeStore } from '@/shared/store/root.store';
import type { ThemeMode } from '@/shared/store/theme.store';
import { createAppTheme } from '@/shared/theme/theme';
import AppHeader from '@/widgets/layout/AppHeader';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import {
  QueryClient,
  onlineManager,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Locale, NextIntlClientProvider } from 'next-intl';
import { SnackbarProvider } from 'notistack';
import { useEffect, useMemo } from 'react';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24 * 3,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    return createQueryClient();
  }

  if (!browserQueryClient) {
    // BackendWakeupRuntime is the source of truth for API readiness. Starting
    // online here would let workspace queries race the Render cold start.
    onlineManager.setOnline(false);
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
};

const ThemedApp = ({
  children,
  initialThemeMode,
}: {
  children: React.ReactNode;
  initialThemeMode: ThemeMode;
}) => {
  const mode = useThemeStore((state) => state.mode);
  const hasHydrated = useThemeStore((state) => state.hasHydrated);
  const initialize = useThemeStore((state) => state.initialize);
  const resolvedMode = hasHydrated ? mode : initialThemeMode;
  const theme = useMemo(
    () => createAppTheme(resolvedMode),
    [resolvedMode],
  );

  useEffect(() => {
    initialize(initialThemeMode);
  }, [initialize, initialThemeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <AuthHydrator />
        <PendingBoardMutationsPrompt />
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  );
};

const Providers = ({
  children,
  messages,
  locale,
  initialThemeMode,
  initialNow,
}: {
  children: React.ReactNode;
  messages: any;
  locale: Locale;
  initialThemeMode: ThemeMode;
  initialNow: Date;
}) => {
  const queryClient = getQueryClient();

  return (
    <AppRouterCacheProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryCachePersister,
          buster: QUERY_CACHE_BUSTER,
          maxAge: QUERY_CACHE_MAX_AGE_MS,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersistQuery,
          },
        }}
      >
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone={defaultTimeZone}
          now={initialNow}
        >
          <ThemedApp initialThemeMode={initialThemeMode}>
            <Box
              sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                color: 'text.primary',
              }}
            >
              <AppHeader initialThemeMode={initialThemeMode} />
              <RouteProgressBar />
              <BackendWakeupRuntime />
              <OfflineRuntime />
              <OfflineNavigationGuard />
              <OfflineNavigationOutlet>
                {children}
              </OfflineNavigationOutlet>
            </Box>
          </ThemedApp>
        </NextIntlClientProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
    </AppRouterCacheProvider>
  );
};

export default Providers;
