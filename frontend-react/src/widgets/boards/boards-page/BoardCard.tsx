'use client';

import type { Board } from '@/shared/api/api';
import { MoreVert, ViewKanban } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActionArea,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface BoardCardProps {
  board: Board;
  onOpenMenu: (anchor: HTMLElement, board: Board) => void;
  canOpenMenu?: boolean;
  isOffline?: boolean;
  isOfflineUnavailable?: boolean;
  onOfflineUnavailable?: (board: Board) => void;
}

const BoardCard = ({
  board,
  onOpenMenu,
  canOpenMenu = true,
  isOffline = false,
  isOfflineUnavailable = false,
  onOfflineUnavailable,
}: BoardCardProps) => {
  const t = useTranslations('Boards');
  const href = `/workspaces/${board.workspaceId}/boards/${board.id}`;
  const isOfflineCachedLink = isOffline && !isOfflineUnavailable;
  const canShowMenu =
    Boolean(board.capabilities?.canDeleteBoard) &&
    canOpenMenu &&
    !isOfflineUnavailable;
  const actionAreaSx = {
    height: '100%',
    p: 2.5,
    pt: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    cursor: isOfflineUnavailable ? 'not-allowed' : 'pointer',
    opacity: isOfflineUnavailable ? 0.58 : 1,
  } as const;
  const content = (
    <>
      <Box sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="h6"
            sx={{ lineHeight: 1.3, flex: 1, fontWeight: 600 }}
          >
            {board.title}
          </Typography>
          {canShowMenu && (
            <IconButton
              size="small"
              aria-label={t('boardActions', { title: board.title })}
              aria-haspopup="menu"
              sx={{ ml: 1, mt: -0.5 }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenMenu(event.currentTarget, board);
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          )}
        </Box>
        {board.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {board.description}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
        }}
      >
        <ViewKanban sx={{ fontSize: 16, color: board.color }} />
        <Typography variant="caption" color="text.secondary">
          {new Date(board.createdAt).toLocaleDateString()}
        </Typography>
      </Box>
    </>
  );

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          height: 160,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            bgcolor: board.color,
          },
        }}
      >
        <Tooltip
          title={isOfflineUnavailable ? t('offlineBoardUnavailable') : ''}
          disableHoverListener={!isOfflineUnavailable}
        >
          {isOfflineUnavailable ? (
            <CardActionArea
              aria-disabled
              onClick={(event) => {
                event.preventDefault();
                onOfflineUnavailable?.(board);
              }}
              sx={actionAreaSx}
            >
              {content}
            </CardActionArea>
          ) : (
            <CardActionArea
              component={isOfflineCachedLink ? 'a' : Link}
              href={href}
              prefetch={isOfflineCachedLink ? undefined : false}
              sx={actionAreaSx}
            >
              {content}
            </CardActionArea>
          )}
        </Tooltip>
      </Card>
    </Grid>
  );
};

export default BoardCard;
