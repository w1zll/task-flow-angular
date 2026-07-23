'use client';

import type { Workspace } from '@/shared/api/api';
import { Business } from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface WorkspaceSettingsHeaderProps {
  workspace: Workspace;
}

const WorkspaceSettingsHeader = ({
  workspace,
}: WorkspaceSettingsHeaderProps) => {
  const t = useTranslations('WorkspaceSettings');

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        minWidth: 0,
        mb: 3,
        alignItems: { xs: 'flex-start', sm: 'center' },
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
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
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2.125rem' },
            fontWeight: 700,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {workspace.name}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ mt: 0.75, flexWrap: 'wrap' }}
        >
          <Chip
            size="small"
            label={t(`role.${workspace.currentUserRole}`)}
          />
          {workspace.isPersonal && (
            <Chip size="small" variant="outlined" label={t('personal')} />
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default WorkspaceSettingsHeader;
