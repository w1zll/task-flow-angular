'use client';

import { alpha, Box, Button, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuthStore } from '@/shared/store/root.store';

const NotFoundPage = () => {
  const t = useTranslations('NotFound');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const href = isAuthenticated ? '/workspaces' : '/';
  const actionLabel = isLoading
    ? t('loadingAction')
    : isAuthenticated
      ? t('authenticatedAction')
      : t('guestAction');

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, md: 12 },
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? `radial-gradient(ellipse 70% 55% at 50% 0%, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 65%), ${theme.palette.background.default}`
            : `radial-gradient(ellipse 70% 55% at 50% 0%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 65%), ${theme.palette.background.default}`,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} sx={{ textAlign: 'center', alignItems: 'center' }}>
          <Typography
            variant="overline"
            sx={{
              letterSpacing: 3,
              color: 'text.secondary',
              fontWeight: 700,
            }}
          >
            {t('eyebrow')}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '5rem', sm: '6.5rem' },
              lineHeight: 0.95,
              fontWeight: 800,
              color: 'primary.main',
            }}
          >
            404
          </Typography>
          <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                fontWeight: 700,
              }}
            >
              {t('title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('description')}
            </Typography>
          </Stack>
          {isLoading ? (
            <Button variant="contained" size="large" disabled sx={{ px: 4 }}>
              {actionLabel}
            </Button>
          ) : (
            <Button
              component={Link}
              href={href}
              variant="contained"
              size="large"
              sx={{ px: 4 }}
            >
              {actionLabel}
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default NotFoundPage;
