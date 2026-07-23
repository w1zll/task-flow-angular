'use client';

import type { BoardMember, BoardView, Team } from '@/shared/api/api';
import { Box, Collapse, LinearProgress, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  areBoardFiltersActive,
  type BoardFilters,
  type BoardTaskStatusFilter,
} from './board-filters';
import ActiveFilterChips from './board-filters-toolbar/ActiveFilterChips';
import BoardFiltersForm from './board-filters-toolbar/BoardFiltersForm';
import BoardFiltersHeader from './board-filters-toolbar/BoardFiltersHeader';
import {
  normalizeLabelsInput,
  uniqueMembers,
  uniqueTeams,
} from './board-filters-toolbar/filterOptions';
import SaveViewDialog from './board-filters-toolbar/SaveViewDialog';
import type { ActiveFilterChip } from './board-filters-toolbar/types';
import BoardLayoutSwitcher from './BoardLayoutSwitcher';
import type { BoardLayout } from './board-layout';

interface Props {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  onReset: () => void;
  boardMembers?: BoardMember[];
  teams?: Team[];
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
  isReorderDisabled: boolean;
  layout: BoardLayout;
  onLayoutChange: (layout: BoardLayout) => void;
  savedViews?: BoardView[];
  selectedViewId?: string | null;
  isSavingView?: boolean;
  isDeletingView?: boolean;
  canManageSavedViews?: boolean;
  onApplySavedView: (viewId: string | null) => void;
  onSaveView: (title: string) => void;
  onDeleteSavedView: (viewId: string) => void;
}

const BoardFiltersToolbar = ({
  filters,
  onChange,
  onReset,
  boardMembers,
  teams,
  filteredCount,
  totalCount,
  isFiltering,
  isReorderDisabled,
  layout,
  onLayoutChange,
  savedViews = [],
  selectedViewId,
  isSavingView = false,
  isDeletingView = false,
  canManageSavedViews = true,
  onApplySavedView,
  onSaveView,
  onDeleteSavedView,
}: Props) => {
  const t = useTranslations('BoardPage.filters');
  const taskCardT = useTranslations('TaskCard');
  const [searchInput, setSearchInput] = useState(filters.search);
  const [labelsInput, setLabelsInput] = useState(filters.labels.join(', '));
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isDesktopFiltersExpanded, setDesktopFiltersExpanded] = useState(false);
  const [viewTitle, setViewTitle] = useState('');
  const desktopFiltersPanelId = 'board-filters-desktop-panel';
  const isActive = areBoardFiltersActive(filters);
  const members = useMemo(() => uniqueMembers(boardMembers), [boardMembers]);
  const sortedTeams = useMemo(() => uniqueTeams(teams), [teams]);
  const selectedSavedViewId = savedViews.some(
    (view) => view.id === selectedViewId,
  )
    ? (selectedViewId ?? '')
    : '';
  const getStatusLabel = (status: BoardTaskStatusFilter) =>
    status === 'all' ? t('allStatuses') : t(`status.${status}`);

  const patchFilters = useCallback(
    (patch: Partial<BoardFilters>) => {
      onChange({ ...filters, ...patch });
    },
    [filters, onChange],
  );

  useEffect(() => {
    setLabelsInput(filters.labels.join(', '));
  }, [filters.labels]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchInput === filters.search) return;

    const timer = window.setTimeout(() => {
      patchFilters({ search: searchInput });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters.search, patchFilters, searchInput]);

  const applyLabelsInput = () => {
    patchFilters({ labels: normalizeLabelsInput(labelsInput) });
  };

  const handleLabelsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyLabelsInput();
    }
  };

  const handleSaveView = () => {
    if (!canManageSavedViews) return;
    const title = viewTitle.trim();
    if (!title) return;
    onSaveView(title);
    setViewTitle('');
    setSaveDialogOpen(false);
  };

  const handleReset = () => {
    setSearchInput('');
    setLabelsInput('');
    onReset();
  };

  const activeChips = [
    filters.search.trim()
      ? {
          key: 'search',
          label: t('chip.search', { value: filters.search.trim() }),
          onDelete: () => {
            setSearchInput('');
            patchFilters({ search: '' });
          },
        }
      : null,
    filters.assignee !== 'all'
      ? {
          key: 'assignee',
          label:
            filters.assignee === 'me'
              ? t('chip.myTasks')
              : filters.assignee === 'unassigned'
                ? t('chip.unassigned')
                : t('chip.assignee', {
                    value:
                      members.find(
                        (member) => member.user.id === filters.assignee,
                      )?.user.name ?? t('unknownAssignee'),
                  }),
          onDelete: () => patchFilters({ assignee: 'all' }),
        }
      : null,
    filters.team !== 'all'
      ? {
          key: 'team',
          label:
            filters.team === 'my'
              ? t('chip.myTeams')
              : t('chip.team', {
                  value:
                    sortedTeams.find((team) => team.id === filters.team)
                      ?.name ?? t('unknownTeam'),
                }),
          onDelete: () => patchFilters({ team: 'all' }),
        }
      : null,
    filters.priority !== 'all'
      ? {
          key: 'priority',
          label: t('chip.priority', {
            value: taskCardT(`priority.${filters.priority}`),
          }),
          onDelete: () => patchFilters({ priority: 'all' }),
        }
      : null,
    filters.status !== 'all'
      ? {
          key: 'status',
          label: getStatusLabel(filters.status),
          onDelete: () => patchFilters({ status: 'all' }),
        }
      : null,
    filters.labels.length > 0
      ? {
          key: 'labels',
          label: t('chip.labels', { value: filters.labels.join(', ') }),
          onDelete: () => patchFilters({ labels: [] }),
        }
      : null,
    filters.unread
      ? {
          key: 'unread',
          label: t('chip.unread'),
          onDelete: () => patchFilters({ unread: false }),
        }
      : null,
    filters.sort !== 'manual'
      ? {
          key: 'sort',
          label: t('chip.sort', { value: t(`sort.${filters.sort}`) }),
          onDelete: () => patchFilters({ sort: 'manual' }),
        }
      : null,
  ].filter(Boolean) as ActiveFilterChip[];

  const filterForm = (
    <BoardFiltersForm
      filters={filters}
      members={members}
      teams={sortedTeams}
      savedViews={savedViews}
      selectedSavedViewId={selectedSavedViewId}
      isActive={isActive}
      filteredCount={filteredCount}
      totalCount={totalCount}
      labelsInput={labelsInput}
      searchInput={searchInput}
      isSavingView={isSavingView}
      isDeletingView={isDeletingView}
      canManageSavedViews={canManageSavedViews}
      onPatchFilters={patchFilters}
      onApplySavedView={onApplySavedView}
      onSearchInputChange={setSearchInput}
      onLabelsInputChange={setLabelsInput}
      onApplyLabelsInput={applyLabelsInput}
      onLabelsKeyDown={handleLabelsKeyDown}
      onReset={handleReset}
      onOpenSaveDialog={() => setSaveDialogOpen(true)}
      onDeleteSavedView={onDeleteSavedView}
    />
  );

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'block' },
        px: { xs: 2, sm: 3 },
        py: { xs: 1, sm: 1.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <Stack spacing={{ md: 1.25 }}>
        <BoardLayoutSwitcher layout={layout} onChange={onLayoutChange} />

        <BoardFiltersHeader
          filteredCount={filteredCount}
          totalCount={totalCount}
          isFiltering={isFiltering}
          isDesktopExpanded={isDesktopFiltersExpanded}
          desktopPanelId={desktopFiltersPanelId}
          onToggleDesktopExpanded={() =>
            setDesktopFiltersExpanded((expanded) => !expanded)
          }
        />

        <Collapse
          in={isDesktopFiltersExpanded}
          timeout="auto"
          unmountOnExit
          sx={{ display: { xs: 'none', md: 'block' } }}
        >
          <Stack id={desktopFiltersPanelId} spacing={1.25}>
            <Box>{filterForm}</Box>

            <ActiveFilterChips
              activeChips={activeChips}
              isReorderDisabled={isReorderDisabled}
            />
          </Stack>
        </Collapse>

      </Stack>

      {isFiltering && (
        <LinearProgress
          aria-label={t('loadingResults')}
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            left: 0,
            height: 2,
          }}
        />
      )}

      <SaveViewDialog
        open={isSaveDialogOpen}
        title={viewTitle}
        isSaving={isSavingView}
        canSave={canManageSavedViews}
        onClose={() => setSaveDialogOpen(false)}
        onTitleChange={setViewTitle}
        onSave={handleSaveView}
      />
    </Box>
  );
};

export default BoardFiltersToolbar;
