'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  useResetAvatar,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  useUpdateAvatar,
} from '@/shared/queries/auth.queries';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { PhotoCamera, RestartAlt } from '@mui/icons-material';
import { useAuth } from '@/features/auth/useAuth';
import UserAvatar from '@/shared/ui/UserAvatar';
import { AVATAR_ACCEPT, validateAvatarFile } from '@/shared/lib/avatar';
import { useSnackbar } from 'notistack';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SignInMethodsCard from '@/features/auth/ui/SignInMethodsCard';

const ProfileClientPage = () => {
  const t = useTranslations('ProfilePage');
  const format = useFormatter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOtherSessions = useRevokeOtherSessions();
  const updateAvatar = useUpdateAvatar();
  const resetAvatar = useResetAvatar();
  const isAvatarPending = updateAvatar.isPending || resetAvatar.isPending;
  const [confirmOthersOpen, setConfirmOthersOpen] = useState(false);
  const searchParams = useSearchParams();
  const oauthNotificationHandled = useRef(false);

  useEffect(() => {
    if (oauthNotificationHandled.current) return;
    oauthNotificationHandled.current = true;
    if (searchParams.get('oauth') === 'linked') {
      enqueueSnackbar(t('oauthLinked'), { variant: 'success' });
    }
    const oauthError = searchParams.get('oauthError');
    if (oauthError) {
      enqueueSnackbar(
        oauthError === 'identity_in_use'
          ? t('oauthIdentityInUse')
          : t('oauthLinkError'),
        { variant: 'error' },
      );
    }
  }, [enqueueSnackbar, searchParams, t]);

  const formatDate = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const getDeviceName = (value: string | null) => {
    if (value === 'desktop' || value === 'mobile' || value === 'tablet') {
      return t(`device.${value}`);
    }
    return value ?? t('deviceFallback');
  };

  const handleAvatarChange = (file?: File) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      enqueueSnackbar(t(`avatarError.${validationError}`), {
        variant: 'error',
      });
      return;
    }

    updateAvatar.mutate(file, {
      onSuccess: () =>
        enqueueSnackbar(t('avatarUpdated'), { variant: 'success' }),
      onError: (error: any) =>
        enqueueSnackbar(
          error.response?.data?.message ?? t('avatarUpdateError'),
          { variant: 'error' },
        ),
    });
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        {t('profileTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('profileDescription')}
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('avatarTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('avatarDescription')}
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            {isAuthLoading ? (
              <Skeleton variant="circular" width={80} height={80} />
            ) : (
              <UserAvatar name={user?.name} src={user?.avatar} size={80} />
            )}
            <Box>
              {isAuthLoading ? (
                <>
                  <Skeleton width={160} />
                  <Skeleton width={220} />
                </>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 600 }}>{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                </>
              )}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <Button
                  component="label"
                  variant="contained"
                  size="small"
                  startIcon={<PhotoCamera />}
                  disabled={isAuthLoading || isAvatarPending}
                >
                  {updateAvatar.isPending
                    ? t('avatarSaving')
                    : t('changeAvatar')}
                  <input
                    hidden
                    type="file"
                    accept={AVATAR_ACCEPT}
                    onChange={(event) => {
                      handleAvatarChange(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RestartAlt />}
                  disabled={isAuthLoading || isAvatarPending}
                  onClick={() =>
                    resetAvatar.mutate(undefined, {
                      onSuccess: () =>
                        enqueueSnackbar(t('avatarReset'), {
                          variant: 'success',
                        }),
                      onError: () =>
                        enqueueSnackbar(t('avatarUpdateError'), {
                          variant: 'error',
                        }),
                    })
                  }
                >
                  {t('resetAvatar')}
                </Button>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                {t('avatarHint')}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <SignInMethodsCard />

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 4 }} gutterBottom>
        {t('sessionsTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('sessionsDescription')}
      </Typography>

      <Button
        color="error"
        variant="outlined"
        sx={{ mt: 1 }}
        disabled={
          (sessionsQuery.data?.length ?? 0) <= 1 ||
          revokeOtherSessions.isPending
        }
        onClick={() => setConfirmOthersOpen(true)}
      >
        {t('endOthers')}
      </Button>

      {sessionsQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : sessionsQuery.isError ? (
        <Typography color="error" sx={{ mt: 3 }}>
          {t('loadingError')}
        </Typography>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {sessionsQuery.data?.length ? (
            sessionsQuery.data.map((session) => (
              <Card key={session.id}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {getDeviceName(session.deviceName)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[session.browser, session.os]
                          .filter(Boolean)
                          .join(' · ') || t('browserUnknown')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {session.ipAddress ?? t('ipUnknown')}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        session.current
                          ? t('currentSession')
                          : t('otherSession')
                      }
                      color={session.current ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    {t('startedAt')}: {formatDate(session.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('lastActive')}: {formatDate(session.lastActiveAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('expiresAt')}: {formatDate(session.expiresAt)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="error"
                    disabled={session.current || revokeSession.isPending}
                    onClick={() =>
                      revokeSession.mutate(session.id, {
                        onSuccess: () =>
                          enqueueSnackbar(t('sessionEnded'), {
                            variant: 'success',
                          }),
                        onError: () =>
                          enqueueSnackbar(t('sessionEndError'), {
                            variant: 'error',
                          }),
                      })
                    }
                  >
                    {t('endSession')}
                  </Button>
                </CardActions>
              </Card>
            ))
          ) : (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {t('noSessions')}
            </Typography>
          )}
        </Stack>
      )}

      <Dialog
        open={confirmOthersOpen}
        onClose={() => setConfirmOthersOpen(false)}
      >
        <DialogTitle>{t('endOthersTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('endOthersDescription')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOthersOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={revokeOtherSessions.isPending}
            onClick={() =>
              revokeOtherSessions.mutate(undefined, {
                onSuccess: () => {
                  setConfirmOthersOpen(false);
                  enqueueSnackbar(t('sessionsEnded'), { variant: 'success' });
                },
                onError: () =>
                  enqueueSnackbar(t('sessionEndError'), { variant: 'error' }),
              })
            }
          >
            {t('endOthers')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfileClientPage;
