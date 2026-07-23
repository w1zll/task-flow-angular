'use client';

import {
  DeleteOutlined,
  RestartAltOutlined,
  SaveOutlined,
} from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { BoardFilters } from '../board-filters';

interface BoardFiltersActionsProps {
  filters: BoardFilters;
  isActive: boolean;
  filteredCount: number;
  totalCount: number;
  selectedSavedViewId: string;
  isSavingView: boolean;
  isDeletingView: boolean;
  canManageSavedViews?: boolean;
  onPatchFilters: (patch: Partial<BoardFilters>) => void;
  onReset: () => void;
  onOpenSaveDialog: () => void;
  onDeleteSavedView: (viewId: string) => void;
}

const BoardFiltersActions = ({
  filters,
  isActive,
  filteredCount,
  totalCount,
  selectedSavedViewId,
  isSavingView,
  isDeletingView,
  canManageSavedViews = true,
  onPatchFilters,
  onReset,
  onOpenSaveDialog,
  onDeleteSavedView,
}: BoardFiltersActionsProps) => {
  const t = useTranslations('BoardPage.filters');

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
    >
      <Button
        size="small"
        variant={filters.assignee === 'me' ? 'contained' : 'outlined'}
        onClick={() =>
          onPatchFilters({
            assignee: filters.assignee === 'me' ? 'all' : 'me',
          })
        }
      >
        {t('myTasks')}
      </Button>
      <Button
        size="small"
        variant={filters.team === 'my' ? 'contained' : 'outlined'}
        onClick={() =>
          onPatchFilters({ team: filters.team === 'my' ? 'all' : 'my' })
        }
      >
        {t('myTeams')}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
        {t('resultCount', { filtered: filteredCount, total: totalCount })}
      </Typography>
      {isActive && (
        <Button
          size="small"
          startIcon={<RestartAltOutlined />}
          onClick={onReset}
          sx={{ ml: { xs: 0, md: 'auto' } }}
        >
          {t('reset')}
        </Button>
      )}
      {isActive && (
        <Button
          size="small"
          startIcon={<SaveOutlined />}
          onClick={onOpenSaveDialog}
          disabled={isSavingView || !canManageSavedViews}
        >
          {t('views.save')}
        </Button>
      )}
      {selectedSavedViewId && (
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlined />}
          onClick={() => onDeleteSavedView(selectedSavedViewId)}
          disabled={isDeletingView || !canManageSavedViews}
        >
          {t('views.delete')}
        </Button>
      )}
    </Stack>
  );
};

export default BoardFiltersActions;
