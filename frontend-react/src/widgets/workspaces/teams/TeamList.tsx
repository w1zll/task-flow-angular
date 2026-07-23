'use client';

import type { Team } from '@/shared/api/api';
import { GroupsOutlined } from '@mui/icons-material';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import TeamCard from './TeamCard';

interface TeamListProps {
  teams?: Team[];
  isLoading: boolean;
  isError: boolean;
  canManage: boolean;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
  onManageMembers: (teamId: string) => void;
}

const TeamList = ({
  teams,
  isLoading,
  isError,
  canManage,
  onEdit,
  onDelete,
  onManageMembers,
}: TeamListProps) => {
  const t = useTranslations('WorkspaceTeams');

  if (isLoading) {
    return (
      <Stack spacing={1.5} sx={{ p: 3 }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={112} />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t('loadError')}
      </Alert>
    );
  }

  if (!teams?.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <GroupsOutlined sx={{ fontSize: 38, color: 'text.disabled' }} />
        <Typography sx={{ mt: 1, fontWeight: 600 }}>
          {t('emptyTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('emptyDescription')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2,
        p: { xs: 2, sm: 3 },
      }}
    >
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onManageMembers={onManageMembers}
        />
      ))}
    </Box>
  );
};

export default TeamList;
