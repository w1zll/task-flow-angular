'use client';

import type { Task } from '@/shared/api/api';
import { GroupsOutlined } from '@mui/icons-material';
import { Chip, Tooltip, alpha } from '@mui/material';
import { useTranslations } from 'next-intl';

interface TaskTeamChipProps {
  team: Task['team'];
}

const TaskTeamChip = ({ team }: TaskTeamChipProps) => {
  const t = useTranslations('TaskCard');

  if (!team) return null;

  return (
    <Tooltip title={t('teamTooltip', { team: team.name })}>
      <Chip
        label={team.name}
        size="small"
        icon={<GroupsOutlined sx={{ fontSize: '12px !important' }} />}
        sx={{
          height: 20,
          mb: 1,
          bgcolor: alpha(team.color, 0.16),
          color: team.color,
          borderColor: alpha(team.color, 0.4),
          fontSize: 11,
          fontWeight: 600,
          '& .MuiChip-label': { px: 0.75 },
          '& .MuiChip-icon': { color: 'inherit' },
        }}
        variant="outlined"
      />
    </Tooltip>
  );
};

export default TaskTeamChip;
