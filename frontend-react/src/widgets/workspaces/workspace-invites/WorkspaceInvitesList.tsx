'use client';

import type { WorkspaceInvite } from '@/shared/api/api';
import { LinkOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useFormatter, useTranslations } from 'next-intl';

interface WorkspaceInvitesListProps {
  invites?: WorkspaceInvite[];
  isLoading: boolean;
  isError: boolean;
  isRevoking: boolean;
  canRevoke?: boolean;
  onRevoke: (inviteId: string) => void;
}

const WorkspaceInvitesList = ({
  invites,
  isLoading,
  isError,
  isRevoking,
  canRevoke = true,
  onRevoke,
}: WorkspaceInvitesListProps) => {
  const t = useTranslations('WorkspaceInvites');
  const format = useFormatter();

  if (isLoading) {
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        {t('loading')}
      </Typography>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {t('loadError')}
      </Alert>
    );
  }

  if (!invites?.length) {
    return (
      <Typography color="text.secondary" sx={{ p: 3 }}>
        {t('empty')}
      </Typography>
    );
  }

  return (
    <Stack divider={<Divider flexItem />}>
      {invites.map((invite) => (
        <Box
          key={invite.id}
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              <Chip size="small" label={t(`role.${invite.defaultRole}`)} />
              {invite.allowedEmailDomain && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`@${invite.allowedEmailDomain}`}
                />
              )}
              {invite.hasSpecificEmailRestriction && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('specificEmail')}
                />
              )}
            </Stack>
            <Typography
              variant="body2"
              sx={{ mt: 0.75, overflowWrap: 'anywhere' }}
            >
              {t('usage', {
                used: invite.usesCount,
                max: invite.maxUses ?? t('unlimited'),
              })}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {t('expires', {
                date: format.dateTime(new Date(invite.expiresAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              })}
            </Typography>
          </Box>
          <Tooltip title={t('revoke')}>
            <IconButton
              color="error"
              onClick={() => onRevoke(invite.id)}
              disabled={isRevoking || !canRevoke}
              aria-label={t('revoke')}
            >
              <LinkOff />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Stack>
  );
};

export default WorkspaceInvitesList;
