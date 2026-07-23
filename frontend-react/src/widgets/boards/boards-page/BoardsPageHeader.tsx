'use client';

import type { Workspace } from '@/shared/api/api';
import { Add } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface BoardsPageHeaderProps {
  isWorkspaceMode: boolean;
  currentWorkspace?: Workspace;
  visibleBoardsCount: number;
  workspacesCount: number;
  onCreateBoard: () => void;
  onCreateWorkspace: () => void;
  canCreate?: boolean;
}

const BoardsPageHeader = ({
  isWorkspaceMode,
  currentWorkspace,
  visibleBoardsCount,
  workspacesCount,
  onCreateBoard,
  onCreateWorkspace,
  canCreate = true,
}: BoardsPageHeaderProps) => {
  const t = useTranslations('Boards');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 4,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {isWorkspaceMode
            ? t('workspaceBoardsTitle', {
                name: currentWorkspace?.name ?? '',
              })
            : t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isWorkspaceMode
            ? t('workspaceBoardsDescription')
            : t('globalDescription')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isWorkspaceMode
            ? t('boardsCount', { count: visibleBoardsCount })
            : t('workspacesCount', { count: workspacesCount })}
        </Typography>
      </Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignSelf: { xs: 'stretch', md: 'center' },
          flexShrink: 0,
          width: { xs: '100%', sm: 'auto' },
          '& .MuiButton-root': {
            justifyContent: 'center',
            minHeight: 44,
            whiteSpace: 'normal',
          },
        }}
      >
        {!isWorkspaceMode && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onCreateWorkspace}
            disabled={!canCreate}
          >
            {t('newWorkspace')}
          </Button>
        )}
        <Button
          variant={isWorkspaceMode ? 'contained' : 'outlined'}
          startIcon={<Add />}
          onClick={onCreateBoard}
          disabled={!canCreate}
        >
          {t('newBoard')}
        </Button>
      </Stack>
    </Box>
  );
};

export default BoardsPageHeader;
