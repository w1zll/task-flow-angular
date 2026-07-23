import type {
  BoardMember,
  Team,
} from '@/shared/api/api';
import UserSelectOption from '@/shared/ui/UserSelectOption';
import { Box, Typography } from '@mui/material';
import type {
  BoardTaskPriority,
  BoardTaskSort,
  BoardTaskStatusFilter,
} from '../board-filters';

export const PRIORITIES: Array<BoardTaskPriority> = [
  'low',
  'medium',
  'high',
  'urgent',
];

export const PRIORITY_META: Record<BoardTaskPriority, { color: string }> = {
  low: { color: '#22c55e' },
  medium: { color: '#f59e0b' },
  high: { color: '#f97316' },
  urgent: { color: '#ef4444' },
};

export const STATUSES: Array<BoardTaskStatusFilter> = [
  'open',
  'completed',
  'overdue',
  'noDueDate',
  'dueToday',
  'dueWeek',
];

export const SORTS: Array<BoardTaskSort> = [
  'manual',
  'dueDate',
  'priority',
  'createdAt',
  'updatedAt',
  'assignee',
];

export const normalizeLabelsInput = (value: string) =>
  value
    .split(',')
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean);

export const uniqueMembers = (members: BoardMember[] = []) =>
  [...members]
    .filter((member) => member.user?.id)
    .sort((a, b) => a.user.name.localeCompare(b.user.name));

export const uniqueTeams = (teams: Team[] = []) =>
  [...teams].sort((a, b) => a.name.localeCompare(b.name));

export const isPriority = (value: string): value is BoardTaskPriority =>
  value in PRIORITY_META;

export const renderMemberOption = (member: BoardMember) => (
  <UserSelectOption
    name={member.user.name}
    avatar={member.user.avatar}
    avatarSize={22}
  />
);

export const renderTeamOption = (team: Team) => (
  <Box
    sx={{
      alignItems: 'center',
      display: 'flex',
      gap: 1,
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        bgcolor: team.color,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '50%',
        flexShrink: 0,
        height: 10,
        width: 10,
      }}
    />
    <Typography
      variant="body2"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
      }}
    >
      {team.name}
    </Typography>
  </Box>
);

export const renderPriorityOption = (
  priority: BoardTaskPriority,
  label: string,
) => (
  <Box
    sx={{
      alignItems: 'center',
      display: 'flex',
      gap: 1,
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        bgcolor: PRIORITY_META[priority].color,
        borderRadius: '50%',
        flexShrink: 0,
        height: 10,
        width: 10,
      }}
    />
    <Typography
      variant="body2"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
      }}
    >
      {label}
    </Typography>
  </Box>
);
