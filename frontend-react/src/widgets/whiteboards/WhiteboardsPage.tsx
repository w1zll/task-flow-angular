'use client';

import { useBoards } from '@/shared/queries/boards.queries';
import { useWorkspaces } from '@/shared/queries/workspaces.queries';
import { useWorkspaceWhiteboards } from '@/shared/queries/whiteboards.queries';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  Add,
  GestureOutlined,
  LinkOutlined,
  OpenInNewOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import WhiteboardCreateDialog from './WhiteboardCreateDialog';

interface Props {
  workspaceId: string;
}

const canCreateWorkspaceWhiteboard = (role?: string) =>
  role === 'owner' || role === 'admin';

const WhiteboardsPage = ({ workspaceId }: Props) => {
  const t = useTranslations('Whiteboards');
  const shellT = useTranslations('WorkspaceShell');
  const router = useRouter();
  const isOffline = useIsOffline();
  const { enqueueSnackbar } = useSnackbar();
  const { data: workspaces = [] } = useWorkspaces();
  const { data: boards = [] } = useBoards();
  const whiteboards = useWorkspaceWhiteboards(workspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const boardsById = useMemo(
    () => new Map(boards.map((board) => [board.id, board])),
    [boards],
  );
  const canCreate =
    canCreateWorkspaceWhiteboard(workspace?.currentUserRole) && !isOffline;
  const openWhiteboard = (whiteboardId: string) => {
    if (isOffline) {
      enqueueSnackbar(shellT('offlineSectionUnavailable'), {
        variant: 'warning',
      });
      return;
    }

    router.push(
      `/workspaces/${workspaceId}/whiteboards/${whiteboardId}`,
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1180,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 4 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <GestureOutlined color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {t('pageTitle')}
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {t('pageDescription')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          disabled={!canCreate}
          onClick={() => setCreateOpen(true)}
        >
          {t('create')}
        </Button>
      </Stack>

      {whiteboards.isLoading && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={22} />
          <Typography>{t('loading')}</Typography>
        </Stack>
      )}

      {whiteboards.isError && <Alert severity="error">{t('loadError')}</Alert>}

      {!whiteboards.isLoading &&
        !whiteboards.isError &&
        !whiteboards.data?.length && (
          <Alert severity="info">{t('empty')}</Alert>
        )}

      <Grid container spacing={2}>
        {whiteboards.data?.map((whiteboard) => {
          const linkedBoard = whiteboard.boardId
            ? boardsById.get(whiteboard.boardId)
            : undefined;

          return (
            <Grid key={whiteboard.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 1 }}>
                <CardActionArea
                  sx={{ height: '100%', alignItems: 'stretch' }}
                  onClick={() => openWhiteboard(whiteboard.id)}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25,
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: whiteboard.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                        {whiteboard.title}
                      </Typography>
                      <OpenInNewOutlined
                        fontSize="small"
                        sx={{ ml: 'auto', color: 'text.secondary' }}
                      />
                    </Stack>
                    {whiteboard.description && (
                      <Typography color="text.secondary" variant="body2">
                        {whiteboard.description}
                      </Typography>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={t(
                          whiteboard.capabilities.canDrawWhiteboard
                            ? 'editable'
                            : 'readOnly',
                        )}
                      />
                      {linkedBoard && (
                        <Chip
                          size="small"
                          icon={<LinkOutlined />}
                          label={linkedBoard.title}
                        />
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <WhiteboardCreateDialog
        open={createOpen}
        workspaceId={workspaceId}
        boards={boards}
        onClose={() => setCreateOpen(false)}
        onCreated={(whiteboard) => openWhiteboard(whiteboard.id)}
      />
    </Box>
  );
};

export default WhiteboardsPage;
