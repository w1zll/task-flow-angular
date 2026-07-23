'use client';

import type { Workspace } from '@/shared/api/api';
import { Business, ViewKanbanOutlined } from '@mui/icons-material';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface WorkspaceOverviewHeaderProps {
  workspace?: Workspace;
  workspaceId: string;
}

const WorkspaceOverviewHeader = ({
  workspace,
  workspaceId,
}: WorkspaceOverviewHeaderProps) => {
  const t = useTranslations('WorkspaceOverview');
  const shellT = useTranslations('WorkspaceShell');

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ minWidth: 0, justifyContent: 'space-between', mb: 3 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', minWidth: 0 }}
        >
          <Box
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 40, sm: 44 },
              borderRadius: '6px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Business />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
                fontWeight: 800,
                lineHeight: 1.2,
                overflowWrap: 'anywhere',
              }}
            >
              {workspace?.name ?? t('loading')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {t('subtitle')}
            </Typography>
          </Box>
        </Stack>
        {workspace && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ mt: 1.5, flexWrap: 'wrap' }}
          >
            <Chip
              size="small"
              label={shellT(`role.${workspace.currentUserRole}`)}
            />
            {workspace.isPersonal && (
              <Chip
                size="small"
                variant="outlined"
                label={shellT('personal')}
              />
            )}
          </Stack>
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: 'stretch', width: { xs: '100%', sm: 'auto' } }}
      >
        <Button
          component={Link}
          href={`/workspaces/${workspaceId}/boards`}
          variant="contained"
          startIcon={<ViewKanbanOutlined />}
        >
          {t('openBoards')}
        </Button>
        <Button
          component={Link}
          href={`/workspaces/${workspaceId}/settings`}
          variant="outlined"
        >
          {t('settings')}
        </Button>
      </Stack>
    </Stack>
  );
};

export default WorkspaceOverviewHeader;
