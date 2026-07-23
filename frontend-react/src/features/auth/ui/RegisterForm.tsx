'use client';

import { useAuth } from '../useAuth';
import { useState } from 'react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import UserAvatar from '@/shared/ui/UserAvatar';
import TaskFlowLogo from '@/shared/ui/TaskFlowLogo';
import {
  AVATAR_ACCEPT,
  AvatarValidationError,
  validateAvatarFile,
} from '@/shared/lib/avatar';
import {
  capturePendingWorkspaceInviteFromLocation,
  getInviteAuthHref,
} from '@/shared/lib/pending-workspace-invite';
import OAuthButtons from './OAuthButtons';

const RegisterForm = () => {
  const t = useTranslations('Auth.Register');
  const { register, isRegisterLoading } = useAuth();
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] =
    useState<AvatarValidationError | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    setInviteToken(capturePendingWorkspaceInviteFromLocation());
  }, []);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(avatar);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ ...form, avatar: avatar ?? undefined });
  };

  const handleAvatarChange = (file?: File) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    setAvatarError(validationError);
    if (validationError) {
      setAvatar(null);
      return;
    }
    setAvatar(file);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <Box
      sx={{
        minHeight: {
          xs: 'calc(100dvh - 56px)',
          sm: 'calc(100dvh - 64px)',
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        background: (theme) =>
          `radial-gradient(ellipse at 70% 20%, ${alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.14 : 0.09,
          )} 0%, transparent 60%), ${theme.palette.background.default}`,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, p: 1 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
            <TaskFlowLogo size={40} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              TaskFlow
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
            {t('heading')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('subtitle')}
          </Typography>

          <OAuthButtons />

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                border: '1px solid',
                borderColor: avatarError ? 'error.main' : 'divider',
                borderRadius: '6px',
              }}
            >
              <UserAvatar
                name={form.name}
                src={avatarPreview}
                size={56}
              />
              <Box sx={{ minWidth: 0 }}>
                <Button
                  component="label"
                  size="small"
                  startIcon={<PhotoCamera />}
                  disabled={isRegisterLoading}
                >
                  {avatar ? t('changeAvatar') : t('chooseAvatar')}
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
                <Typography
                  variant="caption"
                  color={avatarError ? 'error' : 'text.secondary'}
                  sx={{ display: 'block' }}
                >
                  {avatarError
                    ? t(`avatarError.${avatarError}`)
                    : t('avatarHint')}
                </Typography>
              </Box>
            </Box>
            <TextField
              label={t('name')}
              required
              fullWidth
              autoComplete="name"
              {...field('name')}
            />
            <TextField
              label={t('email')}
              type="email"
              required
              fullWidth
              autoComplete="email"
              {...field('email')}
            />
            <TextField
              label={t('password')}
              type="password"
              required
              fullWidth
              autoComplete="new-password"
              slotProps={{
                htmlInput: {
                  minLength: 6,
                },
              }}
              {...field('password')}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isRegisterLoading}
              sx={{ mt: 1, py: 1.5 }}
            >
              {isRegisterLoading ? t('loading') : t('submit')}
            </Button>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3, textAlign: 'center' }}
          >
            {t('haveAccount')}{' '}
            <Link
              component={NextLink}
              href={getInviteAuthHref('/auth/login', inviteToken)}
              sx={{ fontWeight: 600 }}
            >
              {t('login')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterForm;
