'use client';

import type { Workspace } from '@/shared/api/api';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { WorkspaceNavKey } from './navigation';

interface WorkspaceMobileHeaderProps {
  workspace?: Workspace;
  activeNavKey: WorkspaceNavKey;
  onOpenNavigation: () => void;
}

const WorkspaceMobileHeader = ({
  workspace,
  activeNavKey,
  onOpenNavigation,
}: WorkspaceMobileHeaderProps) => {
  const t = useTranslations('WorkspaceShell');
  const navLabels: Record<WorkspaceNavKey, string> = {
    overview: t('nav.overview'),
    myTasks: t('nav.myTasks'),
    teams: t('nav.teams'),
    analytics: t('nav.analytics'),
    boards: t('nav.boards'),
    whiteboards: t('nav.whiteboards'),
    settings: t('nav.settings'),
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: -2,
        zIndex: 9,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <IconButton
        edge="start"
        onClick={onOpenNavigation}
        aria-label={t('openNavigation')}
      >
        <MenuIcon />
      </IconButton>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {workspace?.name ?? t('workspaceFallback')}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {navLabels[activeNavKey]}
        </Typography>
      </Box>
    </Box>
  );
};

export default WorkspaceMobileHeader;
