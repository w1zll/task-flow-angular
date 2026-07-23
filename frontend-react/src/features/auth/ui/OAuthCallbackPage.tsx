'use client';

import { authApi } from '@/shared/api/api';
import { useAuth } from '@/features/auth/useAuth';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/shared/store/root.store';

const allowedErrors = [
  'account_exists',
  'email_unverified',
  'access_denied',
  'expired',
  'identity_in_use',
  'provider_unavailable',
] as const;
type CallbackError = (typeof allowedErrors)[number];

const normalizeError = (value: string | null): CallbackError | null => {
  if (!value) return null;
  return (allowedErrors as readonly string[]).includes(value)
    ? (value as CallbackError)
    : 'provider_unavailable';
};

const OAuthCallbackPage = () => {
  const t = useTranslations('Auth.OAuth.Callback');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { finishAuthentication } = useAuth();
  const hydrate = useAuthStore((state) => state.hydrate);
  const started = useRef(false);
  const linked = searchParams.get('linked');
  const rawError = searchParams.get('error');
  const errorCode = normalizeError(rawError);
  const [completionError, setCompletionError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (linked === 'google' || linked === 'github') {
      void authApi
        .me()
        .then((response) => {
          hydrate(response.data);
          router.replace(`/profile?oauth=linked&provider=${linked}`);
        })
        .catch(() => setCompletionError(true));
      return;
    }
    if (errorCode) return;

    void authApi
      .me()
      .then((response) => finishAuthentication(response.data))
      .catch(() => setCompletionError(true));
  }, [errorCode, finishAuthentication, hydrate, linked, router]);

  const displayedError: CallbackError | null = completionError
    ? 'provider_unavailable'
    : errorCode;

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
        display: 'grid',
        placeItems: 'center',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {displayedError ? (
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t('errorTitle')}
              </Typography>
              <Alert severity="error">{t(`errors.${displayedError}`)}</Alert>
              {displayedError === 'account_exists' && (
                <Typography variant="body2" color="text.secondary">
                  {t('accountExistsHint')}
                </Typography>
              )}
              <Button variant="contained" onClick={() => router.push('/auth/login')}>
                {displayedError === 'account_exists'
                  ? t('signInWithEmail')
                  : t('retry')}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ textAlign: 'center', alignItems: 'center' }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('completing')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pleaseWait')}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OAuthCallbackPage;
