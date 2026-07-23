'use client';

import type { BoardMember, BoardView, Team } from '@/shared/api/api';
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import type {
  BoardFilters,
  BoardTaskSort,
  BoardTaskStatusFilter,
} from '../board-filters';
import {
  isPriority,
  PRIORITIES,
  renderMemberOption,
  renderPriorityOption,
  renderTeamOption,
  SORTS,
  STATUSES,
} from './filterOptions';
import BoardFiltersActions from './BoardFiltersActions';

interface BoardFiltersFormProps {
  filters: BoardFilters;
  members: BoardMember[];
  teams: Team[];
  savedViews: BoardView[];
  selectedSavedViewId: string;
  isActive: boolean;
  filteredCount: number;
  totalCount: number;
  labelsInput: string;
  searchInput: string;
  isSavingView: boolean;
  isDeletingView: boolean;
  canManageSavedViews?: boolean;
  onPatchFilters: (patch: Partial<BoardFilters>) => void;
  onApplySavedView: (viewId: string | null) => void;
  onSearchInputChange: (value: string) => void;
  onLabelsInputChange: (value: string) => void;
  onApplyLabelsInput: () => void;
  onLabelsKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onOpenSaveDialog: () => void;
  onDeleteSavedView: (viewId: string) => void;
}

const BoardFiltersForm = ({
  filters,
  members,
  teams,
  savedViews,
  selectedSavedViewId,
  isActive,
  filteredCount,
  totalCount,
  labelsInput,
  searchInput,
  isSavingView,
  isDeletingView,
  canManageSavedViews = true,
  onPatchFilters,
  onApplySavedView,
  onSearchInputChange,
  onLabelsInputChange,
  onApplyLabelsInput,
  onLabelsKeyDown,
  onReset,
  onOpenSaveDialog,
  onDeleteSavedView,
}: BoardFiltersFormProps) => {
  const t = useTranslations('BoardPage.filters');
  const taskCardT = useTranslations('TaskCard');
  const getStatusLabel = (status: BoardTaskStatusFilter) =>
    status === 'all' ? t('allStatuses') : t(`status.${status}`);
  const getAssigneeValue = (value: string) => {
    if (value === 'all') return t('allAssignees');
    if (value === 'me') return t('myTasks');
    if (value === 'unassigned') return t('unassigned');

    const member = members.find((item) => item.user.id === value);
    return member ? renderMemberOption(member) : t('unknownAssignee');
  };
  const getTeamValue = (value: string) => {
    if (value === 'all') return t('allTeams');
    if (value === 'my') return t('myTeams');

    const team = teams.find((item) => item.id === value);
    return team ? renderTeamOption(team) : t('unknownTeam');
  };
  const getPriorityValue = (value: string) =>
    isPriority(value)
      ? renderPriorityOption(value, taskCardT(`priority.${value}`))
      : t('allPriorities');

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          alignItems: 'center',
          display: 'grid',
          gap: { xs: 1.5, md: 1 },
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(auto-fit, minmax(150px, 1fr))',
          },
          minWidth: 0,
          '& .MuiFormControl-root, & .MuiTextField-root': {
            minWidth: 0,
          },
        }}
      >
        <FormControl size="small">
          <InputLabel>{t('views.label')}</InputLabel>
          <Select
            label={t('views.label')}
            value={selectedSavedViewId}
            onChange={(event) => onApplySavedView(event.target.value || null)}
          >
            <MenuItem value="">{t('views.none')}</MenuItem>
            {savedViews.map((view) => (
              <MenuItem key={view.id} value={view.id}>
                {view.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label={t('search')}
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />

        <FormControl size="small">
          <InputLabel>{t('assignee')}</InputLabel>
          <Select
            label={t('assignee')}
            value={filters.assignee}
            renderValue={(value) => getAssigneeValue(value)}
            onChange={(event) =>
              onPatchFilters({ assignee: event.target.value })
            }
          >
            <MenuItem value="all">{t('allAssignees')}</MenuItem>
            <MenuItem value="me">{t('myTasks')}</MenuItem>
            <MenuItem value="unassigned">{t('unassigned')}</MenuItem>
            {members.map((member) => (
              <MenuItem key={member.user.id} value={member.user.id}>
                {renderMemberOption(member)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>{t('team')}</InputLabel>
          <Select
            label={t('team')}
            value={filters.team}
            renderValue={(value) => getTeamValue(value)}
            onChange={(event) => onPatchFilters({ team: event.target.value })}
          >
            <MenuItem value="all">{t('allTeams')}</MenuItem>
            <MenuItem value="my">{t('myTeams')}</MenuItem>
            {teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {renderTeamOption(team)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>{t('priority')}</InputLabel>
          <Select
            label={t('priority')}
            value={filters.priority}
            renderValue={(value) => getPriorityValue(value)}
            onChange={(event) =>
              onPatchFilters({
                priority: event.target.value as BoardFilters['priority'],
              })
            }
          >
            <MenuItem value="all">{t('allPriorities')}</MenuItem>
            {PRIORITIES.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {renderPriorityOption(
                  priority,
                  taskCardT(`priority.${priority}`),
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>{t('statusLabel')}</InputLabel>
          <Select
            label={t('statusLabel')}
            value={filters.status}
            onChange={(event) =>
              onPatchFilters({
                status: event.target.value as BoardTaskStatusFilter,
              })
            }
          >
            <MenuItem value="all">{t('allStatuses')}</MenuItem>
            {STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {getStatusLabel(status)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>{t('sortLabel')}</InputLabel>
          <Select
            label={t('sortLabel')}
            value={filters.sort}
            onChange={(event) =>
              onPatchFilters({ sort: event.target.value as BoardTaskSort })
            }
          >
            {SORTS.map((sort) => (
              <MenuItem key={sort} value={sort}>
                {t(`sort.${sort}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label={t('labels')}
          value={labelsInput}
          onChange={(event) => onLabelsInputChange(event.target.value)}
          onBlur={onApplyLabelsInput}
          onKeyDown={onLabelsKeyDown}
        />

        <FormControlLabel
          control={
            <Switch
              checked={filters.unread}
              onChange={(event) =>
                onPatchFilters({ unread: event.target.checked })
              }
            />
          }
          label={t('unread')}
          sx={{
            alignSelf: 'center',
            gridColumn: { md: 'span 2' },
            justifySelf: 'start',
            minWidth: { md: 210 },
            '& .MuiFormControlLabel-label': {
              fontSize: 14,
              overflowWrap: 'normal',
              whiteSpace: { md: 'nowrap' },
            },
          }}
        />
      </Box>

      <BoardFiltersActions
        filters={filters}
        isActive={isActive}
        filteredCount={filteredCount}
        totalCount={totalCount}
        selectedSavedViewId={selectedSavedViewId}
        isSavingView={isSavingView}
        isDeletingView={isDeletingView}
        canManageSavedViews={canManageSavedViews}
        onPatchFilters={onPatchFilters}
        onReset={onReset}
        onOpenSaveDialog={onOpenSaveDialog}
        onDeleteSavedView={onDeleteSavedView}
      />
    </Stack>
  );
};

export default BoardFiltersForm;
