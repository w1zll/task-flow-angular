'use client';

import type { Board } from '@/shared/api/api';
import { useCachedBoardDetailIds } from '@/shared/hooks/useCachedBoardDetailIds';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { Add, OpenInNew } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSnackbar } from 'notistack';

interface RecentBoardsPanelProps {
  workspaceId: string;
  boards: Board[];
  isLoading: boolean;
}

const RecentBoardsPanel = ({
  workspaceId,
  boards,
  isLoading,
}: RecentBoardsPanelProps) => {
  const t = useTranslations('WorkspaceOverview');
  const shellT = useTranslations('WorkspaceShell');
  const boardsT = useTranslations('Boards');
  const isOffline = useIsOffline();
  const cachedBoardIds = useCachedBoardDetailIds();
  const { enqueueSnackbar } = useSnackbar();
  const notifyOfflineBoardUnavailable = () => {
    enqueueSnackbar(boardsT('offlineBoardUnavailable'), {
      variant: 'warning',
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0, height: '100%' }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ minWidth: 0, justifyContent: 'space-between', mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('recentBoards')}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {t('recentBoardsDescription')}
          </Typography>
        </Box>
        <Button
          component={Link}
          href={`/workspaces/${workspaceId}/boards`}
          prefetch={false}
          size="small"
          endIcon={<OpenInNew />}
        >
          {t('allBoards')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={68} />
          ))}
        </Stack>
      ) : boards.length ? (
        <Stack spacing={1}>
          {boards.slice(0, 4).map((board) => {
            const isOfflineUnavailable =
              isOffline && !cachedBoardIds.has(board.id);
            const actionAreaSx = {
              p: 1.5,
              cursor: isOfflineUnavailable ? 'not-allowed' : 'pointer',
              opacity: isOfflineUnavailable ? 0.58 : 1,
            } as const;
            const content = (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ minWidth: 0, alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: board.color,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {board.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.2 }}
                  >
                    {board.description || t('noDescription')}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={shellT(`boardRole.${board.currentUserRole}`)}
                  sx={{ flexShrink: 0 }}
                />
              </Stack>
            );

            return (
              <Card key={board.id} variant="outlined">
                <Tooltip
                  title={
                    isOfflineUnavailable
                      ? boardsT('offlineBoardUnavailable')
                      : ''
                  }
                  disableHoverListener={!isOfflineUnavailable}
                >
                  {isOfflineUnavailable ? (
                    <CardActionArea
                      aria-disabled
                      onClick={(event) => {
                        event.preventDefault();
                        notifyOfflineBoardUnavailable();
                      }}
                      sx={actionAreaSx}
                    >
                      {content}
                    </CardActionArea>
                  ) : (
                    <CardActionArea
                      component={isOffline ? 'a' : Link}
                      href={`/workspaces/${workspaceId}/boards/${board.id}`}
                      prefetch={isOffline ? undefined : false}
                      sx={actionAreaSx}
                    >
                      {content}
                    </CardActionArea>
                  )}
                </Tooltip>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">{t('emptyBoards')}</Typography>
          <Button
            component={Link}
            href={`/workspaces/${workspaceId}/boards`}
            prefetch={false}
            startIcon={<Add />}
            variant="contained"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('createFirstBoard')}
          </Button>
        </Stack>
      )}
    </Paper>
  );
};

export default RecentBoardsPanel;
