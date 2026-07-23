'use client';

import {
  applyPendingBoardMutation,
  getBoardSocketAckErrorCode,
  isBoardPermissionError,
  isBoardSocketConflictError,
} from '@/shared/lib/boardSocketMutations';
import { Board, boardsApi } from '@/shared/api/api';
import {
  ensureSocketConnected,
  getSocket,
  isSocketReady,
} from '@/shared/lib/socket';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import { describePendingBoardMutation } from '@/shared/lib/pending-board-mutation-descriptions';
import { queryKeys } from '@/shared/queries/boards.queries';
import { usePendingBoardMutationsStore } from '@/shared/store/root.store';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardSocketAckErrorCode } from '@/shared/store/pending-board-mutations.store';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

const getConflictCode = (error: unknown): BoardSocketAckErrorCode =>
  getBoardSocketAckErrorCode(error) ??
  (isBoardPermissionError(error) ? 'permission_changed' : 'unknown');

const PendingBoardMutationsPrompt = () => {
  const t = useTranslations('PendingChanges');
  const describeT = (key: string, values?: Record<string, unknown>) =>
    t(key as never, values as never);
  const mutations = usePendingBoardMutationsStore((state) => state.mutations);
  const remove = usePendingBoardMutationsStore((state) => state.remove);
  const clear = usePendingBoardMutationsStore((state) => state.clear);
  const markConflict = usePendingBoardMutationsStore(
    (state) => state.markConflict,
  );
  const pruneExpired = usePendingBoardMutationsStore(
    (state) => state.pruneExpired,
  );
  const isOnline = useOnlineStatus();
  const [isSocketAvailable, setIsSocketAvailable] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const pendingMutations = mutations.filter(
    (mutation) => mutation.status === 'pending',
  );
  const isDialogOpen = isOnline && mutations.length > 0;
  const canApplyPendingChanges =
    isDialogOpen && isSocketAvailable && pendingMutations.length > 0;
  const readOnlyMutationCount = mutations.filter(
    (mutation) =>
      mutation.lastErrorCode === 'permission_changed' ||
      qc.getQueryData<Board>(queryKeys.board(mutation.boardId))?.capabilities
        ?.canEditBoardContent === false,
  ).length;
  const allMutationsAreReadOnly =
    mutations.length > 0 && readOnlyMutationCount === mutations.length;

  useStableBodyScrollLock(isDialogOpen);

  useEffect(() => {
    pruneExpired();
  }, [pruneExpired]);

  useEffect(() => {
    if (!isOnline || pendingMutations.length === 0) {
      setIsSocketAvailable(false);
      return;
    }

    const socket = getSocket();
    let isActive = true;
    const syncConnection = () => setIsSocketAvailable(isSocketReady(socket));

    syncConnection();
    void ensureSocketConnected(socket)
      .then(() => {
        if (isActive) syncConnection();
      })
      .catch(() => {
        if (isActive) syncConnection();
      });

    socket.on('connect', syncConnection);
    socket.on('disconnect', syncConnection);
    socket.on('connect_error', syncConnection);
    window.addEventListener('online', syncConnection);
    window.addEventListener('offline', syncConnection);

    return () => {
      isActive = false;
      socket.off('connect', syncConnection);
      socket.off('disconnect', syncConnection);
      socket.off('connect_error', syncConnection);
      window.removeEventListener('online', syncConnection);
      window.removeEventListener('offline', syncConnection);
    };
  }, [isOnline, pendingMutations.length]);

  const invalidateBoards = (boardIds: string[]) => {
    boardIds.forEach((boardId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.board(boardId),
        exact: true,
      });
      qc.invalidateQueries({
        queryKey: queryKeys.boardAnalytics(boardId),
      });
    });
  };

  const handleApply = async () => {
    setIsApplying(true);
    let appliedCount = 0;
    let deniedCount = 0;
    let conflictHandledCount = 0;

    for (const mutation of pendingMutations) {
      try {
        const board =
          qc.getQueryData<Board>(queryKeys.board(mutation.boardId)) ??
          (await qc.fetchQuery({
            queryKey: queryKeys.board(mutation.boardId),
            queryFn: () =>
              boardsApi.getOne(mutation.boardId).then((response) => response.data),
            staleTime: 0,
          }));
        if (!board?.capabilities?.canEditBoardContent) {
          markConflict(mutation.id, {
            code: 'permission_changed',
            message: t('conflict.permission_changed'),
          });
          deniedCount += 1;
          invalidateBoards([mutation.boardId]);
          continue;
        }

        await applyPendingBoardMutation(mutation);
        remove(mutation.id);
        appliedCount += 1;
        invalidateBoards([mutation.boardId]);
      } catch (error) {
        if (isBoardPermissionError(error) || isBoardSocketConflictError(error)) {
          const code = getConflictCode(error);
          markConflict(mutation.id, {
            code,
            message:
              error instanceof Error
                ? error.message
                : t(`conflict.${code}`),
          });
          if (code === 'permission_changed') {
            deniedCount += 1;
          } else {
            conflictHandledCount += 1;
          }
          invalidateBoards([mutation.boardId]);
          continue;
        }
        enqueueSnackbar(t('applyError'), { variant: 'error' });
        setIsApplying(false);
        return;
      }
    }

    if (appliedCount > 0) {
      enqueueSnackbar(t('applied'), { variant: 'success' });
    }
    if (deniedCount > 0) {
      enqueueSnackbar(t('permissionChanged'), { variant: 'warning' });
    }
    if (conflictHandledCount > 0) {
      enqueueSnackbar(t('conflictsDetected'), { variant: 'warning' });
    }
    setIsApplying(false);
  };

  const handleDiscard = () => {
    const boardIds = [...new Set(mutations.map((mutation) => mutation.boardId))];
    clear();
    invalidateBoards(boardIds);
    enqueueSnackbar(t('discarded'), { variant: 'info' });
  };
  const titleId = 'pending-board-mutations-dialog-title';
  const descriptionId = 'pending-board-mutations-dialog-description';

  return (
    <Dialog
      open={isDialogOpen}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{ paper: { sx: { borderRadius: '6px' } } }}
    >
      <DialogTitle id={titleId}>{t('title')}</DialogTitle>
      <DialogContent>
        <Typography id={descriptionId} variant="body2" color="text.secondary">
          {t(
            allMutationsAreReadOnly
              ? 'readOnlyDescription'
              : pendingMutations.length === 0
                ? 'conflictOnlyDescription'
                : 'description',
            { count: mutations.length },
          )}
        </Typography>
        <List
          dense
          aria-label={t('listLabel')}
          sx={{
            mt: 2,
            maxHeight: 260,
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '6px',
          }}
        >
          {mutations.map((mutation) => {
            const isConflict = mutation.status === 'conflict';
            const conflictKey = mutation.lastErrorCode ?? 'unknown';
            const board = qc.getQueryData<Board>(
              queryKeys.board(mutation.boardId),
            );
            const description = describePendingBoardMutation(
              mutation,
              board,
              describeT,
            );

            return (
              <ListItem
                key={mutation.id}
                divider
                sx={{ alignItems: 'flex-start', px: 1.5, py: 1 }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                      >
                        {description.title}
                      </Typography>
                      <Chip
                        size="small"
                        color={isConflict ? 'warning' : 'default'}
                        label={t(isConflict ? 'status.conflict' : 'status.pending')}
                      />
                    </Stack>
                  }
                  secondary={
                    <Stack
                      component="span"
                      spacing={0.4}
                      sx={{ mt: 0.5, color: 'text.secondary' }}
                    >
                      {description.lines.map((line) => (
                        <Typography
                          key={line}
                          component="span"
                          variant="caption"
                          sx={{ color: 'text.primary' }}
                        >
                          {line}
                        </Typography>
                      ))}
                      <Typography component="span" variant="caption">
                        {t('item.createdAt', {
                          time: new Date(mutation.createdAt).toLocaleString(),
                        })}
                      </Typography>
                      {isConflict && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="warning.main"
                        >
                          {t(`conflict.${conflictKey}`)}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button autoFocus onClick={handleDiscard} disabled={isApplying}>
          {t('discard')}
        </Button>
        {!allMutationsAreReadOnly && pendingMutations.length > 0 && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={isApplying || !canApplyPendingChanges}
          >
            {isApplying ? t('applying') : t('apply')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PendingBoardMutationsPrompt;
