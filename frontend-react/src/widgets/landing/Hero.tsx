import { KeyboardArrowDown, PlayArrow } from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { authApi } from '@/shared/api/api';
import { clearOfflineApplicationCaches } from '@/shared/lib/offline-navigation-cache';
import { clearPersistedQueryCache } from '@/shared/lib/query-persistence';
import { useAuthStore } from '@/shared/store/root.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { RefObject, useState } from 'react';

interface Props {
  badgeRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLSpanElement | null>;
  accentRef: RefObject<HTMLElement | null>;
  subtitleRef: RefObject<HTMLHeadingElement | null>;
  buttonsRef: RefObject<HTMLDivElement | null>;
  scrollArrowRef: RefObject<HTMLDivElement | null>;
  featuresRef: RefObject<HTMLDivElement | null>;
}

const Hero = ({
  badgeRef,
  titleRef,
  accentRef,
  subtitleRef,
  buttonsRef,
  scrollArrowRef,
  featuresRef,
}: Props) => {
  const t = useTranslations('HomePage.hero');
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const { enqueueSnackbar } = useSnackbar();
  const [isDemoNavigating, setDemoNavigating] = useState(false);
  const heading = t('heading');
  const headingTokens = heading.match(/\S+|\s+/g) ?? [];
  const demoLogin = useMutation({
    mutationFn: () => authApi.demoLogin().then((response) => response.data),
    onSuccess: async ({ user, workspaceId, boardId }) => {
      setDemoNavigating(true);

      try {
        await clearOfflineApplicationCaches();
        await clearPersistedQueryCache();
        queryClient.clear();
        setUser(user);
        router.push(`/workspaces/${workspaceId}/boards/${boardId}`);
        router.refresh();
      } catch {
        setDemoNavigating(false);
        enqueueSnackbar(t('demoError'), { variant: 'error' });
      }
    },
    onError: (error: any) => {
      setDemoNavigating(false);
      enqueueSnackbar(
        error.response?.data?.message ?? t('demoError'),
        { variant: 'error' },
      );
    },
  });
  const isDemoLoading = demoLogin.isPending || isDemoNavigating;

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        pb: 15,
        textAlign: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.3)} 0%, transparent 70%), ${theme.palette.background.default}`
            : `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 70%), ${theme.palette.background.default}`,
      }}
    >
      <Container maxWidth="md">
        <Chip
          ref={badgeRef}
          label={t('chip')}
          size="small"
          sx={{ mb: 3, fontWeight: 500, opacity: 0 }}
        />
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2.2rem', md: '3.5rem' },
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1,
            mb: 2.5,
            color: 'text.primary',
            overflowWrap: 'normal',
            wordBreak: 'normal',
          }}
        >
          <span
            ref={titleRef}
            aria-label={heading}
            style={{
              display: 'inline-block',
              opacity: 0,
              overflowWrap: 'normal',
              wordBreak: 'normal',
            }}
          >
            {headingTokens.map((token, tokenIndex) =>
              /^\s+$/.test(token) ? (
                <span
                  key={`space-${tokenIndex}`}
                  aria-hidden="true"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {token}
                </span>
              ) : (
                <span
                  key={`${token}-${tokenIndex}`}
                  aria-hidden="true"
                  style={{ display: 'inline-block' }}
                >
                  {Array.from(token).map((char, charIndex) => (
                    <span
                      key={`${char}-${tokenIndex}-${charIndex}`}
                      style={{
                        display: 'inline-block',
                        overflow: 'hidden',
                        verticalAlign: 'top',
                      }}
                    >
                      <span
                        data-hero-char
                        style={{ display: 'inline-block' }}
                      >
                        {char}
                      </span>
                    </span>
                  ))}
                </span>
              ),
            )}
          </span>
          <Box
            ref={accentRef}
            component="span"
            sx={{
              color: 'primary.main',
              display: 'inline-block',
              opacity: 0,
            }}
          >
            {t('headingAccent')}
          </Box>
        </Typography>
        <Typography
          ref={subtitleRef}
          variant="h6"
          color="text.secondary"
          sx={{
            mb: 5,
            maxWidth: 520,
            mx: 'auto',
            fontWeight: 400,
            lineHeight: 1.6,
            opacity: 0,
          }}
        >
          {t('subtitle')}
        </Typography>
        <Stack
          ref={buttonsRef}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: 'center',
            opacity: 0,
            justifyContent: 'center',
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={() => {
              setDemoNavigating(true);
              demoLogin.mutate();
            }}
            disabled={isDemoLoading}
            sx={{ px: 4, py: 1.5, minWidth: { xs: 220, sm: 0 } }}
          >
            {isDemoLoading ? t('ctaDemoLoading') : t('ctaDemo')}
          </Button>
          <Link href="/auth/register">
            <Button
              variant="outlined"
              size="large"
              sx={{ px: 4, py: 1.5, minWidth: { xs: 220, sm: 0 } }}
            >
              {t('ctaStart')}
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              variant="text"
              size="large"
              sx={{ px: 4, py: 1.5, minWidth: { xs: 220, sm: 0 } }}
            >
              {t('ctaLogin')}
            </Button>
          </Link>
        </Stack>
      </Container>

      <Box
        ref={scrollArrowRef}
        onClick={() => {
          featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
        sx={{
          position: 'absolute',
          bottom: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          color: 'text.secondary',
          '&:hover': { color: 'primary.main' },
          transition: 'color 0.2s',
        }}
      >
        <Typography variant="caption">{t('scroll')}</Typography>
        <KeyboardArrowDown sx={{ fontSize: 28 }} />
      </Box>
    </Box>
  );
};

export default Hero;
