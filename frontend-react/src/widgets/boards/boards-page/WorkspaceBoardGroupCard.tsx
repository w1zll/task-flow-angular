'use client';

import type { Board, Workspace } from '@/shared/api/api';
import { Add, Business, Delete } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import BoardCard from './BoardCard';

interface WorkspaceBoardGroupCardProps {
  workspace: Workspace;
  boards: Board[];
  onCreateBoard: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onOpenBoardMenu: (anchor: HTMLElement, board: Board) => void;
  canMutate?: boolean;
  isOffline?: boolean;
  cachedBoardIds?: ReadonlySet<string>;
  onOpenUnavailableBoard?: (board: Board) => void;
  onOpenUnavailableWorkspace?: (workspace: Workspace) => void;
}

const WorkspaceBoardGroupCard = ({
  workspace,
  boards,
  onCreateBoard,
  onDeleteWorkspace,
  onOpenBoardMenu,
  canMutate = true,
  isOffline = false,
  cachedBoardIds,
  onOpenUnavailableBoard,
  onOpenUnavailableWorkspace,
}: WorkspaceBoardGroupCardProps) => {
  const t = useTranslations('Boards');
  const isWorkspaceOfflineUnavailable = isOffline;
  const headerSx = {
    color: 'inherit',
    textDecoration: 'none',
    px: { xs: 2, sm: 3 },
    py: 2,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 2,
    border: 0,
    font: 'inherit',
    textAlign: 'left',
    bgcolor: 'transparent',
    transition: 'background-color 0.2s ease',
    cursor: isWorkspaceOfflineUnavailable ? 'not-allowed' : 'pointer',
    opacity: isWorkspaceOfflineUnavailable ? 0.62 : 1,
    ':hover': { bgcolor: 'action.hover' },
  } as const;
  const headerContent = (
    <>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: 'flex-start',
          flex: '1 1 220px',
          minWidth: 0,
        }}
      >
        <Business color="action" />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
          >
            {workspace.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {workspace.isPersonal
              ? t('personalWorkspace')
              : t(`role.${workspace.currentUserRole}`)}
          </Typography>
        </Box>
      </Stack>
      <Chip size="small" label={t('boardsCount', { count: boards.length })} />
      {workspace.currentUserRole === 'owner' && canMutate && (
        <Tooltip title={t('deleteWorkspace')}>
          <IconButton
            color="error"
            aria-label={t('deleteWorkspace')}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onDeleteWorkspace(workspace.id);
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  );

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Tooltip
        title={
          isWorkspaceOfflineUnavailable
            ? t('offlineWorkspaceUnavailable')
            : ''
        }
        disableHoverListener={!isWorkspaceOfflineUnavailable}
      >
        {isWorkspaceOfflineUnavailable ? (
          <Box
            component="button"
            type="button"
            aria-disabled
            sx={headerSx}
            onClick={(event) => {
              event.preventDefault();
              onOpenUnavailableWorkspace?.(workspace);
            }}
          >
            {headerContent}
          </Box>
        ) : (
          <Box
            component={isOffline ? 'a' : Link}
            href={`/workspaces/${workspace.id}`}
            prefetch={isOffline ? undefined : false}
            sx={headerSx}
          >
            {headerContent}
          </Box>
        )}
      </Tooltip>
      <Divider />
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {boards.length ? (
          <Grid container spacing={2}>
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onOpenMenu={onOpenBoardMenu}
                canOpenMenu={canMutate}
                isOffline={isOffline}
                isOfflineUnavailable={
                  isOffline && !cachedBoardIds?.has(board.id)
                }
                onOfflineUnavailable={onOpenUnavailableBoard}
              />
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('emptyWorkspaceTitle')}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => onCreateBoard(workspace.id)}
              disabled={!canMutate}
            >
              {t('emptyAction')}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default WorkspaceBoardGroupCard;
