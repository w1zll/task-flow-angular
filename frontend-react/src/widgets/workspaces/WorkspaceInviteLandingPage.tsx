'use client';

import { useAuth } from '@/features/auth/useAuth';
import {
  clearPendingWorkspaceInvite,
  getInviteAuthHref,
  savePendingWorkspaceInvite,
} from '@/shared/lib/pending-workspace-invite';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  useAcceptWorkspaceInvite,
  useRegisterFromDemoInvite,
  useWorkspaceInvitePreview,
  useWorkspaces,
} from '@/shared/queries/workspaces.queries';
import { useAuthStore } from '@/shared/store/root.store';
import {
  AutoAwesome,
  Business,
  Login,
  OpenInNew,
  PersonAdd,
} from '@mui/icons-material';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Props {
  token: string;
}

const WorkspaceInviteLandingPage = ({ token }: Props) => {
  const t = useTranslations('WorkspaceInvite');
  const router = useRouter();
  const isOffline = useIsOffline();
  const { user, isLoading: isAuthLoading } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const setActiveWorkspace = useAuthStore(
    (state) => state.setActiveWorkspace,
  );
  const preview = useWorkspaceInvitePreview(token);
  const workspaces = useWorkspaces(Boolean(user));
  const acceptInvite = useAcceptWorkspaceInvite();
  const registerFromDemoInvite = useRegisterFromDemoInvite();
  const isCheckingMembership =
    Boolean(user) && (workspaces.isLoading || workspaces.isFetching);
  const isAlreadyMember = Boolean(
    user &&
      preview.data?.workspaceId &&
      workspaces.data?.some(
        (workspace) => workspace.id === preview.data?.workspaceId,
      ),
  );
  const canUseInstantDemoRegistration = Boolean(
    !user &&
      preview.data?.isDemoInvite &&
      !preview.data.emailRestricted,
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (user) {
      clearPendingWorkspaceInvite();
      return;
    }
    savePendingWorkspaceInvite(token);
  }, [isAuthLoading, token, user]);

  const handleAccept = () => {
    if (isOffline && !isAlreadyMember) return;
    if (preview.data?.workspaceId && isAlreadyMember) {
      setActiveWorkspace(preview.data.workspaceId);
      clearPendingWorkspaceInvite();
      router.push(`/workspaces/${preview.data.workspaceId}`);
      router.refresh();
      return;
    }

    acceptInvite.mutate(token, {
      onSuccess: (workspace) => {
        setActiveWorkspace(workspace.id);
        clearPendingWorkspaceInvite();
        router.push(`/workspaces/${workspace.id}`);
        router.refresh();
      },
    });
  };

  const handleDemoRegistration = () => {
    if (isOffline) return;
    registerFromDemoInvite.mutate(token, {
      onSuccess: (session) => {
        setUser(session.user);
        setActiveWorkspace(session.workspaceId);
        clearPendingWorkspaceInvite();
        router.push(`/workspaces/${session.workspaceId}`);
        router.refresh();
      },
    });
  };

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 5,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack
            spacing={3}
            sx={{ alignItems: 'center', textAlign: 'center' }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '6px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Business fontSize="large" />
            </Box>

            {preview.isLoading || isAuthLoading || isCheckingMembership ? (
              <>
                <CircularProgress />
                <Typography color="text.secondary">
                  {t('loading')}
                </Typography>
              </>
            ) : preview.isError || !preview.data ? (
              <>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {t('unavailableTitle')}
                </Typography>
                <Alert severity="error">{t('unavailableDescription')}</Alert>
              </>
            ) : (
              <>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {preview.data.workspaceName}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {t('invitedBy', { name: preview.data.inviterName })}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Chip
                    label={t(`role.${preview.data.defaultRole}`)}
                    color="primary"
                    variant="outlined"
                  />
                  {preview.data.emailRestricted && (
                    <Chip label={t('emailRestricted')} variant="outlined" />
                  )}
                </Stack>

                {(acceptInvite.isError || registerFromDemoInvite.isError) && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {t('acceptError')}
                  </Alert>
                )}

                {user ? (
                  <Stack spacing={1.5} sx={{ width: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('signedInAs', { email: user.email })}
                    </Typography>
                    {isAlreadyMember && (
                      <Alert severity="info" sx={{ width: '100%' }}>
                        {t('alreadyMember')}
                      </Alert>
                    )}
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleAccept}
                      disabled={acceptInvite.isPending || (isOffline && !isAlreadyMember)}
                      startIcon={isAlreadyMember ? <OpenInNew /> : undefined}
                    >
                      {isAlreadyMember
                        ? t('openWorkspace')
                        : acceptInvite.isPending
                          ? t('accepting')
                          : t('accept')}
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={1.5} sx={{ width: '100%' }}>
                    {canUseInstantDemoRegistration && (
                      <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        startIcon={<AutoAwesome />}
                        onClick={handleDemoRegistration}
                        disabled={registerFromDemoInvite.isPending || isOffline}
                        fullWidth
                      >
                        {registerFromDemoInvite.isPending
                          ? t('instantRegistering')
                          : t('instantRegister')}
                      </Button>
                    )}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ width: '100%' }}
                    >
                      <Button
                        component={Link}
                        href={getInviteAuthHref('/auth/login', token)}
                        variant="outlined"
                        startIcon={<Login />}
                        fullWidth
                      >
                        {t('login')}
                      </Button>
                      <Button
                        component={Link}
                        href={getInviteAuthHref('/auth/register', token)}
                        variant={
                          canUseInstantDemoRegistration
                            ? 'outlined'
                            : 'contained'
                        }
                        startIcon={<PersonAdd />}
                        fullWidth
                      >
                        {t('register')}
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkspaceInviteLandingPage;
