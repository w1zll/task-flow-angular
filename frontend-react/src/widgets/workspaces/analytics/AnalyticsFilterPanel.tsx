'use client';

import { Box, Button, LinearProgress, MenuItem, Paper, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';
import UserSelectOption from '@/shared/ui/UserSelectOption';
import type { AnalyticsFilterPatch, AnalyticsFilters } from './analytics-filters';

interface FilterOption {
  id: string;
  title?: string;
  name?: string;
}

interface MemberOption {
  userId: string;
  user: { name: string; avatar?: string | null; email?: string | null };
}

interface Props {
  filters: AnalyticsFilters;
  boards: FilterOption[];
  teams: FilterOption[];
  members: MemberOption[];
  isBoardsLoading: boolean;
  isTeamsLoading: boolean;
  isMembersLoading: boolean;
  isRefreshing: boolean;
  onUpdate: (patch: AnalyticsFilterPatch) => void;
  onReset: () => void;
}

const AnalyticsFilterPanel = ({
  filters,
  boards,
  teams,
  members,
  isBoardsLoading,
  isTeamsLoading,
  isMembersLoading,
  isRefreshing,
  onUpdate,
  onReset,
}: Props) => {
  const t = useTranslations('WorkspaceAnalytics');

  return (
    <Paper variant="outlined" sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px' }}>
      {isRefreshing && <LinearProgress />}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: 1.5,
          p: { xs: 1.5, sm: 2 },
          alignItems: { sm: 'center' },
        }}
      >
        <TextField
          select
          size="small"
          label={t('filters.board')}
          value={filters.boardId ?? ''}
          disabled={isBoardsLoading}
          onChange={(event) => onUpdate({ boardId: event.target.value || null })}
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px', md: '1 1 190px' }, minWidth: { xs: '100%', sm: 180 } }}
        >
          <MenuItem value="">{t('filters.allBoards')}</MenuItem>
          {boards.map((board) => (
            <MenuItem key={board.id} value={board.id}>{board.title}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('filters.team')}
          value={filters.teamId ?? ''}
          disabled={isTeamsLoading}
          onChange={(event) => onUpdate({ teamId: event.target.value || null })}
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 180px', md: '1 1 170px' }, minWidth: { xs: '100%', sm: 160 } }}
        >
          <MenuItem value="">{t('filters.allTeams')}</MenuItem>
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('filters.assignee')}
          value={filters.assigneeId ?? ''}
          disabled={isMembersLoading}
          onChange={(event) => onUpdate({ assigneeId: event.target.value || null })}
          slotProps={{
            select: {
              renderValue: (value) => {
                const member = members.find((item) => item.userId === value);
                return member ? (
                  <UserSelectOption
                    name={member.user.name}
                    avatar={member.user.avatar}
                    avatarSize={22}
                  />
                ) : (
                  t('filters.allAssignees')
                );
              },
            },
          }}
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 220px', md: '1 1 190px' }, minWidth: { xs: '100%', sm: 180 } }}
        >
          <MenuItem value="">{t('filters.allAssignees')}</MenuItem>
          {members.map((member) => (
            <MenuItem key={member.userId} value={member.userId}>
              <UserSelectOption
                name={member.user.name}
                avatar={member.user.avatar}
                secondary={member.user.email}
              />
            </MenuItem>
          ))}
        </TextField>
        {(['fromDate', 'toDate'] as const).map((key) => (
          <TextField
            key={key}
            size="small"
            type="date"
            label={t(key === 'fromDate' ? 'filters.from' : 'filters.to')}
            value={filters[key]}
            onChange={(event) => onUpdate({ [key]: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 150px' }, minWidth: { xs: '100%', sm: 145 } }}
          />
        ))}
        <Button variant="text" onClick={onReset} sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, minHeight: 40, flexShrink: 0 }}>
          {t('filters.reset')}
        </Button>
      </Box>
    </Paper>
  );
};

export default AnalyticsFilterPanel;
