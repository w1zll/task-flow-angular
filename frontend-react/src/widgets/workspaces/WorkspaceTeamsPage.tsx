'use client';

import { useWorkspaces } from '@/shared/queries/workspaces.queries';
import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import WorkspaceTeamsSection from './WorkspaceTeamsSection';

interface Props {
  workspaceId: string;
}

const WorkspaceTeamsPage = ({ workspaceId }: Props) => {
  const t = useTranslations('WorkspaceTeamsPage');
  const { data: workspaces = [] } = useWorkspaces();
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const canManage =
    workspace?.currentUserRole === 'owner' ||
    workspace?.currentUserRole === 'admin';

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 960,
        minWidth: 0,
        boxSizing: 'border-box',
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 4 },
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
          fontWeight: 800,
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
        }}
      >
        {t('title')}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, overflowWrap: 'anywhere' }}
      >
        {t('description')}
      </Typography>
      <WorkspaceTeamsSection
        workspaceId={workspaceId}
        canManage={canManage}
      />
    </Box>
  );
};

export default WorkspaceTeamsPage;
