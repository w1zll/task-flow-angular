'use client';

import type { Team } from '@/shared/api/api';
import UserAvatar from '@/shared/ui/UserAvatar';
import {
  DeleteOutlined,
  EditOutlined,
  GroupsOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface TeamCardProps {
  team: Team;
  canManage: boolean;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
  onManageMembers: (teamId: string) => void;
}

const TeamCard = ({
  team,
  canManage,
  onEdit,
  onDelete,
  onManageMembers,
}: TeamCardProps) => {
  const t = useTranslations('WorkspaceTeams');

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        minWidth: 0,
        borderLeft: '4px solid',
        borderLeftColor: team.color,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ minWidth: 0, alignItems: 'flex-start' }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
          >
            {team.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minHeight: 20, overflowWrap: 'anywhere' }}
          >
            {team.description || t('noDescription')}
          </Typography>
        </Box>
        {canManage && (
          <>
            <Tooltip title={t('edit')}>
              <IconButton
                size="small"
                onClick={() => onEdit(team)}
                aria-label={`${t('edit')}: ${team.name}`}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('delete')}>
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(team)}
                aria-label={`${t('delete')}: ${team.name}`}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ mt: 2, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <GroupsOutlined color="action" fontSize="small" />
        <Typography variant="caption" color="text.secondary">
          {t('memberCount', { count: team.members.length })}
        </Typography>
        <Box sx={{ display: 'flex', flex: '1 1 92px', minWidth: 0 }}>
          {team.members.slice(0, 4).map((member, index) => (
            <Tooltip key={member.id} title={member.user.name}>
              <Box sx={{ ml: index === 0 ? 0 : -0.6 }}>
                <UserAvatar
                  name={member.user.name}
                  src={member.user.avatar}
                  size={26}
                />
              </Box>
            </Tooltip>
          ))}
        </Box>
        <Button
          size="small"
          onClick={() => onManageMembers(team.id)}
          sx={{ flexShrink: 0 }}
        >
          {canManage ? t('manageMembers') : t('viewMembers')}
        </Button>
      </Stack>
    </Paper>
  );
};

export default TeamCard;
