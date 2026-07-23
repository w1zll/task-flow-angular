'use client';

import {
  AccountTree,
  AdminPanelSettings,
  Analytics,
  AssignmentTurnedIn,
  AttachFile,
  Brush,
  CloudQueue,
  DashboardCustomize,
  FilterAlt,
  Forum,
  Groups,
  History,
  Link as LinkIcon,
  NotificationsActive,
  PendingActions,
  PhoneIphone,
  PlayCircle,
  Security,
  SyncAlt,
  ViewKanban,
} from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Hero';
import Features from './Features';
import { useLandingGSAP } from './hooks/useLandingGSAP';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LandingClient = () => {
  const t = useTranslations('HomePage');

  const FEATURES = [
    {
      id: 'permissions',
      icon: <AdminPanelSettings />,
      title: t('features.permissions.title'),
      desc: t('features.permissions.desc'),
    },
    {
      id: 'pending-changes',
      icon: <PendingActions />,
      title: t('features.pendingChanges.title'),
      desc: t('features.pendingChanges.desc'),
    },
    {
      id: 'pwa',
      icon: <CloudQueue />,
      title: t('features.pwa.title'),
      desc: t('features.pwa.desc'),
    },
    {
      id: 'realtime',
      icon: <SyncAlt />,
      title: t('features.realtime.title'),
      desc: t('features.realtime.desc'),
    },
    {
      id: 'whiteboards',
      icon: <Brush />,
      title: t('features.whiteboards.title'),
      desc: t('features.whiteboards.desc'),
    },
    {
      id: 'auth',
      icon: <Security />,
      title: t('features.auth.title'),
      desc: t('features.auth.desc'),
    },
    {
      id: 'invites',
      icon: <LinkIcon />,
      title: t('features.invites.title'),
      desc: t('features.invites.desc'),
    },
    {
      id: 'notifications',
      icon: <NotificationsActive />,
      title: t('features.notifications.title'),
      desc: t('features.notifications.desc'),
    },
    {
      id: 'task-details',
      icon: <AssignmentTurnedIn />,
      title: t('features.taskDetails.title'),
      desc: t('features.taskDetails.desc'),
    },
    {
      id: 'comments',
      icon: <Forum />,
      title: t('features.comments.title'),
      desc: t('features.comments.desc'),
    },
    {
      id: 'activity',
      icon: <History />,
      title: t('features.activity.title'),
      desc: t('features.activity.desc'),
    },
    {
      id: 'workspaces',
      icon: <AccountTree />,
      title: t('features.workspaces.title'),
      desc: t('features.workspaces.desc'),
    },
    {
      id: 'boards',
      icon: <ViewKanban />,
      title: t('features.boards.title'),
      desc: t('features.boards.desc'),
    },
    {
      id: 'teams',
      icon: <Groups />,
      title: t('features.teams.title'),
      desc: t('features.teams.desc'),
    },
    {
      id: 'views',
      icon: <FilterAlt />,
      title: t('features.views.title'),
      desc: t('features.views.desc'),
    },
    {
      id: 'mobile',
      icon: <PhoneIphone />,
      title: t('features.mobile.title'),
      desc: t('features.mobile.desc'),
    },
    {
      id: 'analytics',
      icon: <Analytics />,
      title: t('features.analytics.title'),
      desc: t('features.analytics.desc'),
    },
    {
      id: 'demo',
      icon: <PlayCircle />,
      title: t('features.demo.title'),
      desc: t('features.demo.desc'),
    },
    {
      id: 'files-profile',
      icon: <AttachFile />,
      title: t('features.filesProfile.title'),
      desc: t('features.filesProfile.desc'),
    },
    {
      id: 'templates',
      icon: <DashboardCustomize />,
      title: t('features.templates.title'),
      desc: t('features.templates.desc'),
    },
  ];

  const refs = useLandingGSAP();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Hero
        badgeRef={refs.badgeRef}
        titleRef={refs.titleRef}
        accentRef={refs.accentRef}
        subtitleRef={refs.subtitleRef}
        buttonsRef={refs.buttonsRef}
        scrollArrowRef={refs.scrollArrowRef}
        featuresRef={refs.featuresRef}
      />
      <Features
        features={FEATURES}
        featuresRef={refs.featuresRef}
        featuresTitleRef={refs.featuresTitleRef}
        featuresSubtitleRef={refs.featuresSubtitleRef}
        cardsRef={refs.cardsRef}
      />
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('footer')}
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingClient;
