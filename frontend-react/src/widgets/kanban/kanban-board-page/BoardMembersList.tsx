'use client';

import type { BoardMember, Team } from '@/shared/api/api';
import UserAvatar from '@/shared/ui/UserAvatar';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface BoardMembersListProps {
  boardMembers?: BoardMember[];
  isLoading: boolean;
  workspaceTeams?: Team[];
  currentUserId?: string;
  canManageBoardMembers: boolean;
  isUpdateMemberRolePending: boolean;
  isUpdateMemberRoleError: boolean;
  isRevokeMemberPending: boolean;
  isRevokeMemberError: boolean;
  onUpdateMemberRole: (
    memberId: string,
    role: 'editor' | 'viewer',
  ) => void;
  onRevokeMember: (memberId: string) => void;
}

const BoardMembersList = ({
  boardMembers,
  isLoading,
  workspaceTeams,
  currentUserId,
  canManageBoardMembers,
  isUpdateMemberRolePending,
  isUpdateMemberRoleError,
  isRevokeMemberPending,
  isRevokeMemberError,
  onUpdateMemberRole,
  onRevokeMember,
}: BoardMembersListProps) => {
  const t = useTranslations('BoardPage');
  const roleLabels: Record<BoardMember['role'], string> = {
    owner: t('roleOwner'),
    editor: t('roleEditor'),
    viewer: t('roleViewer'),
  };

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('loading')}
      </Typography>
    );
  }

  if (!boardMembers?.length) {
    return <Alert severity="info">{t('noMembers')}</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      {[...boardMembers]
        .sort((memberA, memberB) => {
          if (memberA.role === 'owner') return -1;
          if (memberB.role === 'owner') return 1;
          return memberA.user.name.localeCompare(memberB.user.name);
        })
        .map((member) => {
          const { user } = member;
          const isOwner = member.role === 'owner';
          const isCurrentUser = user.id === currentUserId;

          return (
            <Box
              key={user.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', minWidth: 0 }}
              >
                <UserAvatar name={user.name} src={user.avatar} size={36} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {user.name}
                    {isCurrentUser && (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ ml: 1, color: 'primary.main' }}
                      >
                        {t('youSuffix')}
                      </Typography>
                    )}
                  </Typography>
                  <Chip
                    label={roleLabels[member.role]}
                    size="small"
                    color={isOwner ? 'primary' : 'default'}
                    variant={isOwner ? 'filled' : 'outlined'}
                    sx={{ mt: 0.5, height: 20, fontSize: 11 }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    {workspaceTeams
                      ?.filter((team) =>
                        team.members.some(
                          (teamMember) => teamMember.userId === user.id,
                        ),
                      )
                      .map((team) => (
                        <Chip
                          key={team.id}
                          label={team.name}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            color: team.color,
                            borderColor: team.color,
                          }}
                        />
                      ))}
                  </Box>
                </Box>
              </Stack>

              {canManageBoardMembers && !isOwner && member.id && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Select
                    size="small"
                    value={member.role}
                    onChange={(event) =>
                      onUpdateMemberRole(
                        member.id!,
                        event.target.value as 'editor' | 'viewer',
                      )
                    }
                    disabled={isUpdateMemberRolePending}
                    aria-label={t('memberRole')}
                    sx={{ minWidth: 105, fontSize: 12 }}
                  >
                    <MenuItem value="editor">{t('roleEditor')}</MenuItem>
                    <MenuItem value="viewer">{t('roleViewer')}</MenuItem>
                  </Select>
                  <Button
                    size="small"
                    color="error"
                    disabled={isRevokeMemberPending}
                    onClick={() => onRevokeMember(member.id!)}
                  >
                    {t('remove')}
                  </Button>
                </Stack>
              )}
            </Box>
          );
        })}
      {(isUpdateMemberRoleError || isRevokeMemberError) && (
        <Alert severity="error">{t('memberUpdateError')}</Alert>
      )}
    </Stack>
  );
};

export default BoardMembersList;
