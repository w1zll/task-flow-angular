'use client';

import type { Board } from '@/shared/api/api';
import {
  Add,
  GroupOutlined,
  HistoryOutlined,
  LockOutlined,
  QueryStats,
  TuneOutlined,
} from '@mui/icons-material';
import {
  Box,
  Badge,
  Breadcrumbs,
  Button,
  Chip,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';

interface BoardPageHeaderProps {
  board?: Board;
  isLoading: boolean;
  canManageColumns: boolean;
  canEditBoardContent: boolean;
  isMembersOpen: boolean;
  isActivityOpen: boolean;
  activeFilterCount: number;
  onAddColumn: () => void;
  onToggleMembers: () => void;
  onToggleActivity: () => void;
  onOpenMobileTools: () => void;
}

const BoardPageHeader = ({
  board,
  isLoading,
  canManageColumns,
  canEditBoardContent,
  isMembersOpen,
  isActivityOpen,
  activeFilterCount,
  onAddColumn,
  onToggleMembers,
  onToggleActivity,
  onOpenMobileTools,
}: BoardPageHeaderProps) => {
  const t = useTranslations('BoardPage');

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 3 },
        py: { xs: 0.5, md: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: { xs: 'center', lg: 'center' },
        justifyContent: 'space-between',
        flexWrap: { xs: 'nowrap', md: 'wrap' },
        gap: { xs: 1, md: 2 },
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'center', md: 'flex-start' },
          flex: { xs: '1 1 auto', md: '1 1 320px' },
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          gap: { xs: 1, md: 1.5 },
          minWidth: 0,
        }}
      >
        {board && (
          <Box
            sx={{
              width: { xs: 10, md: 14 },
              height: { xs: 10, md: 14 },
              borderRadius: '50%',
              bgcolor: board.color,
              flexShrink: 0,
              mt: { xs: 0, md: 1 },
            }}
          />
        )}
        <Box sx={{ flex: { xs: '1 1 auto', md: '1 1 240px' }, minWidth: 0 }}>
          {isLoading ? (
            <Skeleton width={200} height={32} />
          ) : (
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.05rem', md: '1.25rem' },
                fontWeight: 700,
                lineHeight: { xs: 1.15, md: 1.25 },
                overflowWrap: 'anywhere',
              }}
            >
              {board?.title}
            </Typography>
          )}
          <Breadcrumbs
            sx={{
              display: { xs: 'none', md: 'flex' },
              fontSize: 12,
              '& .MuiBreadcrumbs-ol': {
                alignItems: 'center',
                flexWrap: 'wrap',
              },
              '& .MuiBreadcrumbs-li': {
                minWidth: 0,
              },
            }}
          >
            <Link
              component={NextLink}
              prefetch={false}
              href={
                board?.workspaceId
                  ? `/workspaces/${board.workspaceId}/boards`
                  : '/workspaces'
              }
              color="inherit"
              underline="hover"
              sx={{ fontSize: 12, overflowWrap: 'anywhere' }}
            >
              {t('boardsLink')}
            </Link>
            <Typography
              color="text.primary"
              sx={{ fontSize: 12, overflowWrap: 'anywhere' }}
            >
              {board?.title}
            </Typography>
          </Breadcrumbs>
        </Box>
        {canManageColumns ? (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={onAddColumn}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                flexShrink: 0,
                alignSelf: 'center',
              }}
            >
              {t('addColumn')}
            </Button>
            <Tooltip title={t('addColumn')}>
              <IconButton
                size="small"
                onClick={onAddColumn}
                aria-label={t('addColumn')}
                sx={{
                  display: 'none',
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : board && !canEditBoardContent ? (
          <Chip
            size="small"
            icon={<LockOutlined />}
            label={t('readOnly')}
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, mt: 0.5 }}
          />
        ) : null}
        {board && !canManageColumns && !canEditBoardContent && (
          <Tooltip title={t('readOnly')}>
            <Box
              component="span"
              aria-label={t('readOnly')}
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '6px',
                color: 'text.secondary',
                flexShrink: 0,
              }}
            >
              <LockOutlined sx={{ fontSize: 18 }} />
            </Box>
          </Tooltip>
        )}
      </Box>

      <Stack
        direction="row"
        spacing={{ xs: 0.25, sm: 1 }}
        useFlexGap
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 1 auto',
          flexShrink: 0,
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
          justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          maxWidth: '100%',
          '& .MuiButton-root': {
            whiteSpace: 'normal',
          },
        }}
      >
        <Button
          component={NextLink}
          prefetch={false}
          href={
            board
              ? `/workspaces/${board.workspaceId}/analytics?boardId=${encodeURIComponent(board.id)}`
              : '/workspaces'
          }
          disabled={!board}
          variant="outlined"
          size="small"
          startIcon={<QueryStats />}
          sx={{ display: 'inline-flex' }}
        >
          {t('stats')}
        </Button>
        <Button
          variant={isActivityOpen ? 'contained' : 'outlined'}
          size="small"
          startIcon={<HistoryOutlined />}
          onClick={onToggleActivity}
          sx={{ display: 'inline-flex' }}
        >
          {t('activity')}
        </Button>
        <Tooltip title={t('activity')}>
          <IconButton
            size="small"
            color={isActivityOpen ? 'primary' : 'default'}
            onClick={onToggleActivity}
            aria-label={t('activity')}
            sx={{
              display: 'none',
              width: 36,
              height: 36,
            }}
          >
            <HistoryOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button
          variant={isMembersOpen ? 'contained' : 'outlined'}
          size="small"
          startIcon={<GroupOutlined />}
          onClick={onToggleMembers}
          sx={{ display: 'inline-flex' }}
        >
          {t('members')}
        </Button>
        <Tooltip title={t('members')}>
          <IconButton
            size="small"
            color={isMembersOpen ? 'primary' : 'default'}
            onClick={onToggleMembers}
            aria-label={t('members')}
            sx={{
              display: 'none',
              width: 36,
              height: 36,
            }}
          >
            <GroupOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Tooltip title={t('mobileTools.title')}>
        <IconButton
          onClick={onOpenMobileTools}
          aria-label={t('mobileTools.open')}
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            width: 44,
            height: 44,
            flexShrink: 0,
          }}
        >
          <Badge
            color="primary"
            badgeContent={activeFilterCount}
            invisible={activeFilterCount === 0}
          >
            <TuneOutlined />
          </Badge>
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default BoardPageHeader;
