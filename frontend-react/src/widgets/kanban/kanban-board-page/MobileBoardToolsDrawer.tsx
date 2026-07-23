'use client';

import type {
  BoardMember,
  BoardView,
  Team,
  Whiteboard,
} from '@/shared/api/api';
import {
  Add,
  BarChartOutlined,
  Close,
  ExpandMoreOutlined,
  GestureOutlined,
  GroupOutlined,
  HistoryOutlined,
  LinkOutlined,
  OpenInNewOutlined,
  SettingsOutlined,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';
import type { BoardFilters } from '../board-filters';
import BoardLayoutSwitcher from '../BoardLayoutSwitcher';
import type { BoardLayout } from '../board-layout';
import BoardFiltersForm from '../board-filters-toolbar/BoardFiltersForm';
import SaveViewDialog from '../board-filters-toolbar/SaveViewDialog';
import {
  normalizeLabelsInput,
  uniqueMembers,
  uniqueTeams,
} from '../board-filters-toolbar/filterOptions';

interface Props {
  open: boolean;
  activeFilterCount: number;
  filters: BoardFilters;
  layout: BoardLayout;
  boardMembers?: BoardMember[];
  teams?: Team[];
  savedViews?: BoardView[];
  selectedViewId?: string | null;
  filteredCount: number;
  totalCount: number;
  isSavingView: boolean;
  isDeletingView: boolean;
  canManageSavedViews: boolean;
  linkedWhiteboards: Whiteboard[];
  isWhiteboardsError: boolean;
  canCreateOrAttachWhiteboard: boolean;
  canManageColumns: boolean;
  analyticsHref: string;
  onClose: () => void;
  onFiltersChange: (filters: BoardFilters) => void;
  onFiltersReset: () => void;
  onLayoutChange: (layout: BoardLayout) => void;
  onApplySavedView: (viewId: string | null) => void;
  onSaveView: (title: string) => void;
  onDeleteSavedView: (viewId: string) => void;
  onOpenWhiteboard: (whiteboardId: string) => void;
  onAttachWhiteboard: () => void;
  onCreateWhiteboard: () => void;
  onAddColumn: () => void;
  onOpenActivity: () => void;
  onOpenMembers: () => void;
}

const MobileBoardToolsDrawer = ({
  open,
  activeFilterCount,
  filters,
  layout,
  boardMembers,
  teams,
  savedViews = [],
  selectedViewId,
  filteredCount,
  totalCount,
  isSavingView,
  isDeletingView,
  canManageSavedViews,
  linkedWhiteboards,
  isWhiteboardsError,
  canCreateOrAttachWhiteboard,
  canManageColumns,
  analyticsHref,
  onClose,
  onFiltersChange,
  onFiltersReset,
  onLayoutChange,
  onApplySavedView,
  onSaveView,
  onDeleteSavedView,
  onOpenWhiteboard,
  onAttachWhiteboard,
  onCreateWhiteboard,
  onAddColumn,
  onOpenActivity,
  onOpenMembers,
}: Props) => {
  const t = useTranslations('BoardPage');
  const filtersT = useTranslations('BoardPage.filters');
  const whiteboardsT = useTranslations('Whiteboards');
  const [searchInput, setSearchInput] = useState(filters.search);
  const [labelsInput, setLabelsInput] = useState(filters.labels.join(', '));
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewTitle, setViewTitle] = useState('');
  const members = useMemo(() => uniqueMembers(boardMembers), [boardMembers]);
  const sortedTeams = useMemo(() => uniqueTeams(teams), [teams]);
  const selectedSavedViewId = savedViews.some(
    (view) => view.id === selectedViewId,
  )
    ? (selectedViewId ?? '')
    : '';

  useEffect(() => {
    if (!open) return;
    setSearchInput(filters.search);
    setLabelsInput(filters.labels.join(', '));
  }, [filters.labels, filters.search, open]);

  const patchFilters = (patch: Partial<BoardFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const applyLabelsInput = () =>
    patchFilters({ labels: normalizeLabelsInput(labelsInput) });

  const handleLabelsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyLabelsInput();
  };

  const handleReset = () => {
    setSearchInput('');
    setLabelsInput('');
    onFiltersReset();
  };

  const handleApply = () => {
    onFiltersChange({
      ...filters,
      search: searchInput,
      labels: normalizeLabelsInput(labelsInput),
    });
    onClose();
  };

  const handleSaveView = () => {
    if (!canManageSavedViews) return;
    const title = viewTitle.trim();
    if (!title) return;
    onSaveView(title);
    setViewTitle('');
    setSaveDialogOpen(false);
  };

  const handleOpenSaveDialog = () => {
    onFiltersChange({
      ...filters,
      search: searchInput,
      labels: normalizeLabelsInput(labelsInput),
    });
    onClose();
    setSaveDialogOpen(true);
  };

  const closeThen = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'mobile-board-tools-title',
            sx: {
              display: { xs: 'flex', md: 'none' },
              maxHeight: '88dvh',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Stack sx={{ minHeight: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', px: 2, py: 1.25, flexShrink: 0 }}
          >
            <SettingsOutlined color="primary" />
            <Typography
              id="mobile-board-tools-title"
              variant="h6"
              sx={{ flex: 1, fontWeight: 700 }}
            >
              {t('mobileTools.title')}
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                size="small"
                color="primary"
                label={filtersT('activeCount', { count: activeFilterCount })}
              />
            )}
            <IconButton
              onClick={onClose}
              aria-label={t('closePanel')}
              sx={{ width: 44, height: 44 }}
            >
              <Close />
            </IconButton>
          </Stack>
          <Divider />

          <Box sx={{ overflowY: 'auto', minHeight: 0, px: 1, py: 0.5 }}>
            <Accordion defaultExpanded disableGutters elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined />}
                sx={{ minHeight: 48 }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {t('layout.label')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <BoardLayoutSwitcher
                  layout={layout}
                  onChange={onLayoutChange}
                  hideLabel
                  mobileGrid
                />
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded disableGutters elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined />}
                sx={{ minHeight: 48 }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {filtersT('title')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <BoardFiltersForm
                  filters={filters}
                  members={members}
                  teams={sortedTeams}
                  savedViews={savedViews}
                  selectedSavedViewId={selectedSavedViewId}
                  isActive={activeFilterCount > 0}
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
                  onOpenSaveDialog={handleOpenSaveDialog}
                  onDeleteSavedView={onDeleteSavedView}
                />
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined />}
                sx={{ minHeight: 48 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <GestureOutlined color="primary" fontSize="small" />
                  <Typography sx={{ fontWeight: 700 }}>
                    {whiteboardsT('boardSectionTitle')}
                  </Typography>
                  <Chip
                    size="small"
                    label={whiteboardsT('linkedCount', {
                      count: linkedWhiteboards.length,
                    })}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      startIcon={<LinkOutlined />}
                      disabled={!canCreateOrAttachWhiteboard}
                      onClick={closeThen(onAttachWhiteboard)}
                      sx={{ minHeight: 44 }}
                    >
                      {whiteboardsT('attach')}
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Add />}
                      disabled={!canCreateOrAttachWhiteboard}
                      onClick={closeThen(onCreateWhiteboard)}
                      sx={{ minHeight: 44 }}
                    >
                      {whiteboardsT('create')}
                    </Button>
                  </Stack>
                  {isWhiteboardsError && (
                    <Alert severity="error">{whiteboardsT('loadError')}</Alert>
                  )}
                  {linkedWhiteboards.length > 0 && (
                    <List disablePadding>
                      {linkedWhiteboards.map((whiteboard) => (
                        <ListItemButton
                          key={whiteboard.id}
                          onClick={closeThen(() =>
                            onOpenWhiteboard(whiteboard.id),
                          )}
                          sx={{ minHeight: 44, borderRadius: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 38 }}>
                            <GestureOutlined sx={{ color: whiteboard.color }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={whiteboard.title}
                            secondary={
                              whiteboard.capabilities.canDrawWhiteboard
                                ? whiteboardsT('editable')
                                : whiteboardsT('readOnly')
                            }
                            slotProps={{ primary: { noWrap: true } }}
                          />
                          <OpenInNewOutlined fontSize="small" />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined />}
                sx={{ minHeight: 48 }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  {t('mobileTools.actions')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <List disablePadding>
                  <ListItemButton
                    disabled={!canManageColumns}
                    onClick={closeThen(onAddColumn)}
                    sx={{ minHeight: 44, borderRadius: 1 }}
                  >
                    <ListItemIcon><Add /></ListItemIcon>
                    <ListItemText primary={t('addColumn')} />
                  </ListItemButton>
                  <ListItemButton
                    component={NextLink}
                    href={analyticsHref}
                    prefetch={false}
                    onClick={onClose}
                    sx={{ minHeight: 44, borderRadius: 1 }}
                  >
                    <ListItemIcon><BarChartOutlined /></ListItemIcon>
                    <ListItemText primary={t('stats')} />
                  </ListItemButton>
                  <ListItemButton
                    onClick={closeThen(onOpenActivity)}
                    sx={{ minHeight: 44, borderRadius: 1 }}
                  >
                    <ListItemIcon><HistoryOutlined /></ListItemIcon>
                    <ListItemText primary={t('activity')} />
                  </ListItemButton>
                  <ListItemButton
                    onClick={closeThen(onOpenMembers)}
                    sx={{ minHeight: 44, borderRadius: 1 }}
                  >
                    <ListItemIcon><GroupOutlined /></ListItemIcon>
                    <ListItemText primary={t('members')} />
                  </ListItemButton>
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
          >
            <Button
              fullWidth
              variant="outlined"
              disabled={activeFilterCount === 0}
              onClick={handleReset}
              sx={{ minHeight: 44 }}
            >
              {filtersT('reset')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleApply}
              sx={{ minHeight: 44 }}
            >
              {filtersT('apply')}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <SaveViewDialog
        open={isSaveDialogOpen}
        title={viewTitle}
        isSaving={isSavingView}
        canSave={canManageSavedViews}
        onClose={() => setSaveDialogOpen(false)}
        onTitleChange={setViewTitle}
        onSave={handleSaveView}
      />
    </>
  );
};

export default MobileBoardToolsDrawer;
