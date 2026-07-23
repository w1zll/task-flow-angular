'use client';

import { GitHub, Google } from '@mui/icons-material';
import { Box, Button, CircularProgress, Divider } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { authApi, type OAuthProvider } from '@/shared/api/api';
import { capturePendingWorkspaceInviteFromLocation } from '@/shared/lib/pending-workspace-invite';
import { useOAuthProviders } from '@/shared/queries/auth.queries';

const providerIcon = {
  google: <Google />,
  github: <GitHub />,
} satisfies Record<OAuthProvider, React.ReactNode>;

const OAuthButtons = () => {
  const t = useTranslations('Auth.OAuth');
  const providersQuery = useOAuthProviders();
  const [startingProvider, setStartingProvider] =
    useState<OAuthProvider | null>(null);

  const providers = providersQuery.data?.providers ?? [];
  if (!providersQuery.isLoading && providers.length === 0) return null;

  const start = (provider: OAuthProvider) => {
    capturePendingWorkspaceInviteFromLocation();
    setStartingProvider(provider);
    window.location.assign(authApi.oauthStartUrl(provider));
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {providersQuery.isLoading ? (
          <Button variant="outlined" size="large" disabled>
            <CircularProgress size={20} />
          </Button>
        ) : (
          providers.map((provider) => (
            <Button
              key={provider}
              variant="outlined"
              size="large"
              fullWidth
              startIcon={providerIcon[provider]}
              disabled={startingProvider !== null}
              onClick={() => start(provider)}
              aria-label={t(`continue.${provider}`)}
              sx={{ py: 1.25 }}
            >
              {startingProvider === provider
                ? t('redirecting')
                : t(`continue.${provider}`)}
            </Button>
          ))
        )}
      </Box>
      <Divider sx={{ my: 2.5 }}>{t('or')}</Divider>
    </Box>
  );
};

export default OAuthButtons;
