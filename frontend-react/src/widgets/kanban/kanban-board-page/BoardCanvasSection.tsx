'use client';

import type { Board } from '@/shared/api/api';
import {
  ViewColumnOutlined,
  ViewKanbanOutlined,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  CircularProgress,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import KanbanBoard from '../KanbanBoard';
import MobileKanbanBoard from '../MobileKanbanBoard';
import AddColumnComposer from './AddColumnComposer';
import { subtleScrollbarSx } from './scrollbarSx';

interface BoardCanvasSectionProps {
  boardId: string;
  isLoading: boolean;
  isFiltering: boolean;
  filteredBoard?: Board;
  highlightedTaskId?: string | null;
  isReorderDisabled: boolean;
  canManageColumns: boolean;
  isAddingColumn: boolean;
  newColumnTitle: string;
  isCreatingColumn: boolean;
  boardScrollWidth: number;
  hasBoardHorizontalOverflow: boolean;
  boardScrollRef: RefObject<HTMLDivElement | null>;
  boardTopScrollRef: RefObject<HTMLDivElement | null>;
  boardContentRef: RefObject<HTMLDivElement | null>;
  onBoardScroll: () => void;
  onTopScroll: () => void;
  onNewColumnTitleChange: (title: string) => void;
  onAddColumn: () => void;
  onCancelAddColumn: () => void;
}

type MobileBoardMode = 'single' | 'board';

const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const useResolvedMediaQuery = (mediaQuery: string) => {
  const query = useMemo(
    () => mediaQuery.replace(/^@media\s*/, ''),
    [mediaQuery],
  );
  const [matches, setMatches] = useState<boolean | null>(null);

  useBrowserLayoutEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [query]);

  return matches;
};

const BoardCanvasSection = ({
  boardId,
  isLoading,
  isFiltering,
  filteredBoard,
  highlightedTaskId,
  isReorderDisabled,
  canManageColumns,
  isAddingColumn,
  newColumnTitle,
  isCreatingColumn,
  boardScrollWidth,
  hasBoardHorizontalOverflow,
  boardScrollRef,
  boardTopScrollRef,
  boardContentRef,
  onBoardScroll,
  onTopScroll,
  onNewColumnTitleChange,
  onAddColumn,
  onCancelAddColumn,
}: BoardCanvasSectionProps) => {
  const tFilters = useTranslations('BoardPage.filters');
  const tMobile = useTranslations('BoardPage.mobile');
  const theme = useTheme();
  const isMobileBoard = useResolvedMediaQuery(theme.breakpoints.down('md'));
  const [mobileBoardMode, setMobileBoardMode] =
    useState<MobileBoardMode>('single');
  const isSingleColumnMode =
    isMobileBoard === true && mobileBoardMode === 'single';
  const isViewportResolved = isMobileBoard !== null;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isLoading || !isViewportResolved ? (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flex: 1,
            minHeight: 0,
            px: { xs: 2, sm: 3 },
            pt: 2,
          }}
        >
          {Array.from({ length: isMobileBoard === false ? 3 : 1 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                width={280}
                height={400}
              />
            ),
          )}
        </Box>
      ) : filteredBoard ? (
        <Box
          sx={{
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {isFiltering && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                pt: 2,
                pointerEvents: 'none',
                bgcolor: (theme) =>
                  alpha(theme.palette.background.default, 0.36),
                backdropFilter: 'blur(1px)',
              }}
            >
              <Stack
                role="status"
                aria-live="polite"
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  px: 1.5,
                  py: 0.75,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                }}
              >
                <CircularProgress size={16} thickness={5} />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                >
                  {tFilters('loadingResults')}
                </Typography>
              </Stack>
            </Box>
          )}
          {isMobileBoard && (
            <Box
              sx={{
                flexShrink: 0,
                px: 2,
                py: 1,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={mobileBoardMode}
                aria-label={tMobile('viewModeLabel')}
                onChange={(_, nextMode: MobileBoardMode | null) => {
                  if (nextMode) setMobileBoardMode(nextMode);
                }}
                sx={{
                  width: '100%',
                  '& .MuiToggleButton-root': {
                    flex: 1,
                    gap: 0.75,
                    minHeight: 40,
                    px: 1,
                    textTransform: 'none',
                    whiteSpace: 'normal',
                  },
                }}
              >
                <ToggleButton
                  value="single"
                  aria-label={tMobile('viewSingle')}
                >
                  <ViewColumnOutlined fontSize="small" />
                  {tMobile('viewSingle')}
                </ToggleButton>
                <ToggleButton
                  value="board"
                  aria-label={tMobile('viewBoard')}
                >
                  <ViewKanbanOutlined fontSize="small" />
                  {tMobile('viewBoard')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          {isSingleColumnMode ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {canManageColumns && isAddingColumn ? (
                <Box sx={{ px: 2, pt: 2, pb: 0, flexShrink: 0 }}>
                  <AddColumnComposer
                    title={newColumnTitle}
                    isCreating={isCreatingColumn}
                    onTitleChange={onNewColumnTitleChange}
                    onSubmit={onAddColumn}
                    onCancel={onCancelAddColumn}
                  />
                </Box>
              ) : null}
              <MobileKanbanBoard
                board={filteredBoard}
                highlightedTaskId={highlightedTaskId}
                isReorderDisabled={isReorderDisabled}
              />
            </Box>
          ) : (
            <>
              <Box
                ref={boardTopScrollRef}
                onScroll={onTopScroll}
                sx={{
                  ...subtleScrollbarSx,
                  display: hasBoardHorizontalOverflow ? 'block' : 'none',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  height: 14,
                  flexShrink: 0,
                }}
              >
                <Box sx={{ width: boardScrollWidth, height: 1 }} />
              </Box>
              <Box
                ref={boardScrollRef}
                onScroll={onBoardScroll}
                sx={{
                  ...subtleScrollbarSx,
                  flex: 1,
                  minHeight: 0,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  minWidth: 0,
                }}
              >
                <Box
                  ref={boardContentRef}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    width: 'max-content',
                    minWidth: '100%',
                    boxSizing: 'border-box',
                    px: { xs: 2, sm: 3 },
                    pt: 2,
                    pb: 2,
                  }}
                >
                  <Box sx={{ flexShrink: 0 }}>
                    <KanbanBoard
                      key={boardId}
                      board={filteredBoard}
                      highlightedTaskId={highlightedTaskId}
                      isReorderDisabled={isReorderDisabled}
                    />
                  </Box>
                  {canManageColumns && isAddingColumn ? (
                    <AddColumnComposer
                      title={newColumnTitle}
                      isCreating={isCreatingColumn}
                      onTitleChange={onNewColumnTitleChange}
                      onSubmit={onAddColumn}
                      onCancel={onCancelAddColumn}
                    />
                  ) : null}
                </Box>
              </Box>
            </>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default BoardCanvasSection;
