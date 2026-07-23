'use client';

import type { Workspace } from '@/shared/api/api';
import { Business, KeyboardArrowDown } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface WorkspaceSwitcherButtonProps {
  workspace?: Workspace;
  onOpenMenu: (anchor: HTMLElement) => void;
}

const WorkspaceSwitcherButton = ({
  workspace,
  onOpenMenu,
}: WorkspaceSwitcherButtonProps) => {
  const t = useTranslations('WorkspaceShell');

  return (
    <Button
      fullWidth
      color="inherit"
      endIcon={<KeyboardArrowDown />}
      onClick={(event) => onOpenMenu(event.currentTarget)}
      sx={{
        justifyContent: 'space-between',
        textAlign: 'left',
        textTransform: 'none',
        border: '1px solid',
        borderColor: 'divider',
        px: 1.25,
        py: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '6px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            flexShrink: 0,
          }}
        >
          <Business fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            variant="body2"
            sx={{
              display: 'block',
              fontWeight: 700,
              overflowWrap: 'anywhere',
            }}
          >
            {workspace?.name ?? t('workspaceFallback')}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', overflowWrap: 'anywhere' }}
          >
            {workspace
              ? workspace.isPersonal
                ? t('personal')
                : t(`role.${workspace.currentUserRole}`)
              : t('loading')}
          </Typography>
        </Box>
      </Stack>
    </Button>
  );
};

export default WorkspaceSwitcherButton;
