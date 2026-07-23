'use client';

import { GitHub, Google, Lock } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { authApi, type OAuthProvider } from '@/shared/api/api';
import { useAuthMethods, useUnlinkProvider } from '@/shared/queries/auth.queries';

const icons = {
  google: <Google />,
  github: <GitHub />,
} satisfies Record<OAuthProvider, React.ReactNode>;

const SignInMethodsCard = () => {
  const t = useTranslations('ProfilePage.signInMethods');
  const methods = useAuthMethods();
  const unlink = useUnlinkProvider();
  const { enqueueSnackbar } = useSnackbar();

  const connect = (provider: OAuthProvider) => {
    window.location.assign(authApi.oauthLinkUrl(provider));
  };

  const disconnect = (provider: OAuthProvider) => {
    unlink.mutate(provider, {
      onSuccess: () => enqueueSnackbar(t('disconnected'), { variant: 'success' }),
      onError: (error: any) => {
        const code = error.response?.data?.code;
        enqueueSnackbar(
          code === 'last_method' ? t('lastMethodError') : t('disconnectError'),
          { variant: 'error' },
        );
      },
    });
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('description')}
        </Typography>
        {methods.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : methods.isError ? (
          <Alert severity="error">{t('loadingError')}</Alert>
        ) : (
          <Stack spacing={1.5}>
            <MethodRow
              icon={<Lock />}
              label={t('password')}
              connected={Boolean(methods.data?.local)}
              unavailable={!methods.data?.local}
              status={methods.data?.local ? t('connectedStatus') : t('notConnectedStatus')}
            />
            {methods.data?.providers.map((method) => (
              <MethodRow
                key={method.provider}
                icon={icons[method.provider]}
                label={t(`provider.${method.provider}`)}
                connected={method.connected}
                unavailable={!method.available}
                status={
                  method.connected
                    ? t('connectedStatus')
                    : method.available
                      ? t('notConnectedStatus')
                      : t('unavailableStatus')
                }
                action={
                  method.connected ? (
                    <Button
                      size="small"
                      color="error"
                      disabled={unlink.isPending}
                      onClick={() => disconnect(method.provider)}
                    >
                      {t('disconnect')}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!method.available || unlink.isPending}
                      onClick={() => connect(method.provider)}
                    >
                      {t('connect')}
                    </Button>
                  )
                }
              />
            ))}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('providerSettingsHint')}
        </Typography>
      </CardContent>
    </Card>
  );
};

const MethodRow = ({
  icon,
  label,
  connected,
  unavailable,
  status,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
  unavailable: boolean;
  status: string;
  action?: React.ReactNode;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: 'auto minmax(0, 1fr)',
        sm: 'auto minmax(0, 1fr) auto',
      },
      alignItems: 'center',
      gap: 1.5,
      p: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
    }}
  >
    {icon}
    <Typography sx={{ minWidth: 0, fontWeight: 600 }}>{label}</Typography>
    <Box
      sx={{
        gridColumn: { xs: '1 / -1', sm: 'auto' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: { xs: 'space-between', sm: 'flex-end' },
        gap: 1,
        minWidth: 0,
      }}
    >
      <Chip
        size="small"
        color={connected ? 'success' : unavailable ? 'default' : 'info'}
        label={status}
        aria-label={`${label}: ${status}`}
      />
      {action}
    </Box>
  </Box>
);

export default SignInMethodsCard;
