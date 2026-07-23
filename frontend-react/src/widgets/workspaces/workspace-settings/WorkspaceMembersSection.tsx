'use client';

import type { Workspace, WorkspaceMember } from '@/shared/api/api';
import {
  Alert,
  Box,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import WorkspaceMemberRow from './WorkspaceMemberRow';

interface WorkspaceMembersSectionProps {
  workspace: Workspace;
  members?: WorkspaceMember[];
  isLoading: boolean;
  isError: boolean;
  currentUserId?: string;
  isUpdatingRole: boolean;
  onChangeRole: (memberId: string, role: 'admin' | 'member') => void;
  onRemoveMember: (memberId: string) => void;
}

const WorkspaceMembersSection = ({
  workspace,
  members,
  isLoading,
  isError,
  currentUserId,
  isUpdatingRole,
  onChangeRole,
  onRemoveMember,
}: WorkspaceMembersSectionProps) => {
  const t = useTranslations('WorkspaceSettings');

  return (
    <Paper
      variant="outlined"
      sx={{ minWidth: 0, borderRadius: '6px', overflow: 'hidden' }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('membersTitle')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {t('membersDescription')}
        </Typography>
      </Box>
      <Divider />

      {isLoading ? (
        <Stack spacing={1.5} sx={{ p: 3 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={52} />
          ))}
        </Stack>
      ) : isError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {t('membersError')}
        </Alert>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {members?.map((member) => (
            <WorkspaceMemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              currentUserRole={workspace.currentUserRole}
              isUpdatingRole={isUpdatingRole}
              onChangeRole={onChangeRole}
              onRemove={onRemoveMember}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default WorkspaceMembersSection;
