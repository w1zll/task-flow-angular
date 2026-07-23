'use client';

import type { Board, Workspace } from '@/shared/api/api';
import { Add } from '@mui/icons-material';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import {
  type WorkspaceNavKey,
  workspaceNavItems,
} from './navigation';
import WorkspaceSwitcherButton from './WorkspaceSwitcherButton';

interface WorkspaceSidebarProps {
  workspaceId: string;
  workspace?: Workspace;
  boards: Board[];
  activeNavKey: WorkspaceNavKey;
  activeBoardId?: string;
  onCloseNavigation: () => void;
  onOpenCreateBoard: () => void;
  onOpenWorkspaceMenu: (anchor: HTMLElement) => void;
  canCreateBoard?: boolean;
  isOffline?: boolean;
  cachedBoardIds?: ReadonlySet<string>;
  onOpenUnavailableBoard?: (board: Board) => void;
  onOpenCachedBoardOffline?: (board: Board) => boolean;
  onOpenUnavailableSection?: () => void;
}

const WorkspaceSidebar = ({
  workspaceId,
  workspace,
  boards,
  activeNavKey,
  activeBoardId,
  onCloseNavigation,
  onOpenCreateBoard,
  onOpenWorkspaceMenu,
  canCreateBoard = true,
  isOffline = false,
  cachedBoardIds,
  onOpenUnavailableBoard,
  onOpenCachedBoardOffline,
  onOpenUnavailableSection,
}: WorkspaceSidebarProps) => {
  const t = useTranslations('WorkspaceShell');
  const theme = useTheme();
  const navLabels: Record<WorkspaceNavKey, string> = {
    overview: t('nav.overview'),
    myTasks: t('nav.myTasks'),
    teams: t('nav.teams'),
    analytics: t('nav.analytics'),
    boards: t('nav.boards'),
    whiteboards: t('nav.whiteboards'),
    settings: t('nav.settings'),
  };
  const boardRoleLabels = {
    owner: t('boardRole.owner'),
    editor: t('boardRole.editor'),
    viewer: t('boardRole.viewer'),
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 2 }}>
        <WorkspaceSwitcherButton
          workspace={workspace}
          onOpenMenu={onOpenWorkspaceMenu}
        />
      </Box>

      <Box sx={{ px: 1.25 }}>
        <List dense>
          {workspaceNavItems.map((item) => {
            const href = item.href(workspaceId);
            const isActive = activeNavKey === item.key;
            const navItemSx = {
              borderRadius: '6px',
              mb: 0.25,
              cursor: isOffline ? 'not-allowed' : 'pointer',
              opacity: isOffline ? 0.58 : 1,
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                '& .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
              },
            } as const;
            const navItemContent = (
              <>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={navLabels[item.key]} />
              </>
            );

            return isOffline ? (
              <ListItemButton
                key={item.key}
                selected={isActive}
                aria-disabled
                onClick={(event) => {
                  event.preventDefault();
                  onOpenUnavailableSection?.();
                }}
                sx={navItemSx}
              >
                {navItemContent}
              </ListItemButton>
            ) : (
              <ListItemButton
                key={item.key}
                component={NextLink}
                href={href}
                prefetch={false}
                selected={isActive}
                onClick={onCloseNavigation}
                sx={navItemSx}
              >
                {navItemContent}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box
        sx={{
          px: 2,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ lineHeight: 1.2 }}
        >
          {t('boards')}
        </Typography>
        <Tooltip title={t('createBoard')}>
          <IconButton
            size="small"
            onClick={onOpenCreateBoard}
            aria-label={t('createBoard')}
            disabled={!canCreateBoard}
          >
            <Add fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ px: 1.25, pb: 1, overflowY: 'auto', flex: 1 }}>
        {boards.length ? (
          <List dense disablePadding>
            {boards.map((board) => {
              const isActive = board.id === activeBoardId;
              const isOfflineUnavailable =
                isOffline && !cachedBoardIds?.has(board.id);
              const itemSx = {
                borderRadius: '6px',
                mb: 0.25,
                alignItems: 'flex-start',
                cursor: isOfflineUnavailable ? 'not-allowed' : 'pointer',
                opacity: isOfflineUnavailable ? 0.56 : 1,
                '&.Mui-selected': {
                  bgcolor: alpha(board.color ?? '#669266', 0.14),
                },
              } as const;
              const itemContent = (
                <>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: board.color ?? '#669266',
                      mt: 1,
                      mr: 1.25,
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    primary={board.title}
                    secondary={boardRoleLabels[board.currentUserRole]}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: isActive ? 700 : 500,
                          overflowWrap: 'anywhere',
                        },
                      },
                      secondary: {
                        sx: {
                          overflowWrap: 'anywhere',
                        },
                      },
                    }}
                  />
                </>
              );

              return isOfflineUnavailable ? (
                <ListItemButton
                  key={board.id}
                  selected={isActive}
                  aria-disabled
                  onClick={(event) => {
                    event.preventDefault();
                    onOpenUnavailableBoard?.(board);
                  }}
                  sx={itemSx}
                >
                  {itemContent}
                </ListItemButton>
              ) : (
                <ListItemButton
                  key={board.id}
                  component={isOffline ? 'a' : NextLink}
                  href={`/workspaces/${workspaceId}/boards/${board.id}`}
                  prefetch={isOffline ? undefined : false}
                  selected={isActive}
                  onClick={(event) => {
                    onCloseNavigation();
                    if (!isOffline) return;

                    if (onOpenCachedBoardOffline?.(board)) {
                      event.preventDefault();
                    }
                  }}
                  sx={itemSx}
                >
                  {itemContent}
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            {t('emptyBoards')}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 2, pt: 1 }}>
        <Chip
          size="small"
          label={t('boardsCount', { count: boards.length })}
          sx={{ width: '100%' }}
        />
      </Box>
    </Box>
  );
};

export default WorkspaceSidebar;
