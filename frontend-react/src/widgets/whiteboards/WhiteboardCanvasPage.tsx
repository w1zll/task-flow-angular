'use client';

import { useAuth } from '@/features/auth/useAuth';
import type {
  Whiteboard,
  WhiteboardOperation,
  WhiteboardOperationType,
  WhiteboardState,
} from '@/shared/api/api';
import { useWhiteboardSocket } from '@/shared/hooks/useWhiteboardSocket';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  ensureWhiteboardSocketConnected,
  getWhiteboardSocket,
} from '@/shared/lib/socket';
import {
  appendOperationToState,
  useDeleteWhiteboard,
  useUpdateWhiteboard,
  useWhiteboardState,
} from '@/shared/queries/whiteboards.queries';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  WHITEBOARD_COLORS,
  WhiteboardPoint,
  WhiteboardTool,
  createIdempotencyKey,
  getOperationsFromState,
  getUndoneOperationIds,
  getVisibleOperations,
} from './whiteboard-drawing';
import WhiteboardPixiCanvas from './WhiteboardPixiCanvas';
import {
  ArrowBack,
  BackspaceOutlined,
  BorderColorOutlined,
  Close,
  CropSquareOutlined,
  DeleteOutlineOutlined,
  DeleteSweepOutlined,
  DownloadOutlined,
  DriveFileRenameOutlineOutlined,
  GestureOutlined,
  HighlightOutlined,
  HorizontalRuleOutlined,
  NorthEastOutlined,
  PanToolAltOutlined,
  RedoOutlined,
  StickyNote2Outlined,
  TuneOutlined,
  UndoOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  workspaceId: string;
  whiteboardId: string;
}

const toolIcons: Record<WhiteboardTool, ReactElement> = {
  pan: <PanToolAltOutlined fontSize="small" />,
  pen: <BorderColorOutlined fontSize="small" />,
  highlighter: <HighlightOutlined fontSize="small" />,
  eraser: <BackspaceOutlined fontSize="small" />,
  line: <HorizontalRuleOutlined fontSize="small" />,
  rectangle: <CropSquareOutlined fontSize="small" />,
  arrow: <NorthEastOutlined fontSize="small" />,
  text: <StickyNote2Outlined fontSize="small" />,
};

const toolOrder: WhiteboardTool[] = [
  'pan',
  'pen',
  'highlighter',
  'eraser',
  'line',
  'rectangle',
  'arrow',
  'text',
];

const renderableTypes = new Set<WhiteboardOperationType>([
  'stroke',
  'shape',
  'text',
]);

const optimisticTypes = new Set<WhiteboardOperationType>([
  'stroke',
  'shape',
  'text',
  'move',
]);
const CURSOR_EMIT_THROTTLE_MS = 50;

const WhiteboardCanvasPage = ({ workspaceId, whiteboardId }: Props) => {
  const t = useTranslations('Whiteboards');
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const isOffline = useIsOffline();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pendingSequenceRef = useRef(0);
  const lastCursorSentAtRef = useRef(0);
  const pendingCursorRef = useRef<WhiteboardPoint | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const stateQuery = useWhiteboardState(workspaceId, whiteboardId);
  const updateWhiteboard = useUpdateWhiteboard(workspaceId);
  const deleteWhiteboard = useDeleteWhiteboard(workspaceId);
  const { remoteCursors } = useWhiteboardSocket(workspaceId, whiteboardId);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState(WHITEBOARD_COLORS[1]);
  const [width, setWidth] = useState(4);
  const [opacity, setOpacity] = useState(0.9);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [textNotePoint, setTextNotePoint] = useState<WhiteboardPoint | null>(
    null,
  );
  const [textNoteDraft, setTextNoteDraft] = useState('');
  const [pendingOperations, setPendingOperations] = useState<
    WhiteboardOperation[]
  >([]);

  const state = stateQuery.data;
  const whiteboard = state?.whiteboard;
  const serverOperations = useMemo(
    () =>
      getOperationsFromState(
        state?.snapshot?.data.operations,
        state?.operations ?? [],
      ),
    [state?.operations, state?.snapshot?.data.operations],
  );
  const visibleServerOperations = useMemo(
    () => getVisibleOperations(serverOperations),
    [serverOperations],
  );
  const canDraw = Boolean(
    whiteboard?.capabilities.canDrawWhiteboard && !isOffline,
  );
  const canManage = Boolean(
    whiteboard?.capabilities.canManageWhiteboard && !isOffline,
  );

  useEffect(() => {
    const confirmedKeys = new Set(
      serverOperations.map((operation) => operation.idempotencyKey),
    );
    setPendingOperations((current) => {
      const next = current.filter(
        (operation) => !confirmedKeys.has(operation.idempotencyKey),
      );
      return next.length === current.length ? current : next;
    });
  }, [serverOperations]);

  const removePendingOperation = useCallback((idempotencyKey: string) => {
    setPendingOperations((current) =>
      current.filter((operation) => operation.idempotencyKey !== idempotencyKey),
    );
  }, []);

  const addPendingOperation = useCallback(
    (
      type: WhiteboardOperationType,
      data: Record<string, unknown>,
      idempotencyKey: string,
    ) => {
      if (!optimisticTypes.has(type)) return;
      setPendingOperations((current) => [
        ...current,
        {
          id: `pending-${idempotencyKey}`,
          whiteboardId,
          sequence:
            Number.MAX_SAFE_INTEGER -
            100_000 +
            pendingSequenceRef.current++,
          userId: user?.id ?? 'local',
          idempotencyKey,
          type,
          data,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [user?.id, whiteboardId],
  );

  const appendConfirmedOperation = useCallback(
    (operation: WhiteboardOperation) => {
      queryClient.setQueryData<WhiteboardState | undefined>(
        queryKeys.whiteboardState(workspaceId, whiteboardId),
        (previous) => appendOperationToState(previous, operation),
      );
      queryClient.setQueryData<Whiteboard | undefined>(
        queryKeys.whiteboard(workspaceId, whiteboardId),
        (previous) =>
          previous
            ? {
                ...previous,
                lastSequence: Math.max(
                  previous.lastSequence ?? 0,
                  operation.sequence,
                ),
              }
            : previous,
      );
    },
    [queryClient, whiteboardId, workspaceId],
  );

  const emitOperation = useCallback(
    async (
      type: WhiteboardOperationType,
      data: Record<string, unknown>,
      eventName: 'whiteboard:operation' | 'whiteboard:clear' =
        'whiteboard:operation',
      idempotencyKey = createIdempotencyKey(),
    ) => {
      if (isOffline) {
        enqueueSnackbar(t('offlineReadOnly'), { variant: 'warning' });
        removePendingOperation(idempotencyKey);
        return;
      }

      try {
        const socket = await ensureWhiteboardSocketConnected(
          getWhiteboardSocket(),
        );
        const payload =
          eventName === 'whiteboard:clear'
            ? { whiteboardId, idempotencyKey }
            : {
                whiteboardId,
                idempotencyKey,
                type,
                data,
              };
        socket.emit(
          eventName,
          payload,
          (response?: {
            ok?: boolean;
            message?: string;
            operation?: WhiteboardOperation;
          }) => {
            if (response?.ok) {
              if (response.operation) {
                appendConfirmedOperation(response.operation);
              }
            } else {
              enqueueSnackbar(response?.message ?? t('operationError'), {
                variant: 'error',
              });
            }
            removePendingOperation(idempotencyKey);
          },
        );
      } catch {
        removePendingOperation(idempotencyKey);
        enqueueSnackbar(t('socketUnavailable'), { variant: 'error' });
      }
    },
    [
      appendConfirmedOperation,
      enqueueSnackbar,
      isOffline,
      removePendingOperation,
      t,
      whiteboardId,
    ],
  );

  const handleCommitOperation = useCallback(
    (type: WhiteboardOperationType, data: Record<string, unknown>) => {
      if (!canDraw) {
        enqueueSnackbar(t('readOnly'), { variant: 'info' });
        return;
      }
      const idempotencyKey = createIdempotencyKey();
      addPendingOperation(type, data, idempotencyKey);
      setRedoStack([]);
      void emitOperation(type, data, 'whiteboard:operation', idempotencyKey);
    },
    [addPendingOperation, canDraw, emitOperation, enqueueSnackbar, t],
  );

  const emitCursor = useCallback(
    (point: WhiteboardPoint) => {
      if (!whiteboardId || isOffline) return;
      const socket = getWhiteboardSocket();
      if (!socket.connected) return;
      socket.emit('whiteboard:cursor', {
        whiteboardId,
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
        color,
        tool: activeTool,
        userName: user?.name,
      });
    },
    [activeTool, color, isOffline, user?.name, whiteboardId],
  );

  const handleCursorMove = useCallback(
    (point: WhiteboardPoint) => {
      if (!whiteboardId || isOffline) return;
      pendingCursorRef.current = point;

      const flushCursor = () => {
        const nextPoint = pendingCursorRef.current;
        if (!nextPoint) return;
        pendingCursorRef.current = null;
        lastCursorSentAtRef.current = performance.now();
        emitCursor(nextPoint);
      };

      const elapsed = performance.now() - lastCursorSentAtRef.current;
      if (elapsed >= CURSOR_EMIT_THROTTLE_MS) {
        if (cursorTimerRef.current) {
          window.clearTimeout(cursorTimerRef.current);
          cursorTimerRef.current = null;
        }
        flushCursor();
        return;
      }

      if (!cursorTimerRef.current) {
        cursorTimerRef.current = window.setTimeout(() => {
          cursorTimerRef.current = null;
          flushCursor();
        }, CURSOR_EMIT_THROTTLE_MS - elapsed);
      }
    },
    [emitCursor, isOffline, whiteboardId],
  );

  useEffect(
    () => () => {
      if (cursorTimerRef.current) {
        window.clearTimeout(cursorTimerRef.current);
      }
    },
    [],
  );

  const handleUndo = () => {
    if (!canDraw || !user) return;
    const undone = getUndoneOperationIds(serverOperations);
    const target = [...visibleServerOperations]
      .reverse()
      .find(
        (operation) =>
          operation.userId === user.id &&
          renderableTypes.has(operation.type) &&
          !undone.has(operation.id),
      );
    if (!target) return;
    setRedoStack((current) => [target.id, ...current]);
    void emitOperation('undo', { targetOperationId: target.id });
  };

  const handleRedo = () => {
    if (!canDraw) return;
    const [targetOperationId, ...rest] = redoStack;
    if (!targetOperationId) return;
    setRedoStack(rest);
    void emitOperation('redo', { targetOperationId });
  };

  const handleClear = () => {
    if (!canManage) return;
    void emitOperation('clear', {}, 'whiteboard:clear');
  };

  const handleRename = () => {
    if (!whiteboard || !canManage) return;
    setRenameTitle(whiteboard.title);
    setRenameOpen(true);
  };

  const confirmRename = () => {
    const title = renameTitle.trim();
    if (!whiteboard || !canManage || !title) return;
    updateWhiteboard.mutate(
      {
        whiteboardId,
        data: { title },
      },
      {
        onSuccess: () => setRenameOpen(false),
      },
    );
  };

  const handleDelete = () => {
    if (!whiteboard || !canManage) return;
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!whiteboard || !canManage) return;
    deleteWhiteboard.mutate(whiteboard, {
      onSuccess: () => router.push(`/workspaces/${workspaceId}/whiteboards`),
    });
  };

  const handleExportPng = () => {
    const canvas = hostRef.current?.querySelector('canvas');
    if (!canvas) return;
    requestAnimationFrame(() => {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${whiteboard?.title ?? 'whiteboard'}.png`;
      link.click();
    });
  };

  const openTextNoteDialog = useCallback((point: WhiteboardPoint) => {
    setTextNotePoint(point);
    setTextNoteDraft('');
  }, []);

  const confirmTextNote = () => {
    const text = textNoteDraft.trim();
    if (!text || !textNotePoint) return;
    handleCommitOperation('text', {
      text,
      x: textNotePoint.x,
      y: textNotePoint.y,
      color,
    });
    setTextNotePoint(null);
    setTextNoteDraft('');
  };

  const renderToolPicker = () => (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={activeTool}
      onChange={(_, nextTool: WhiteboardTool | null) => {
        if (nextTool) setActiveTool(nextTool);
      }}
      aria-label={t('tools')}
      sx={{
        overflowX: 'auto',
        maxWidth: '100%',
        '& .MuiToggleButton-root': {
          width: 36,
          height: 34,
          p: 0,
          flexShrink: 0,
        },
      }}
    >
      {toolOrder.map((tool) => (
        <ToggleButton
          key={tool}
          value={tool}
          aria-label={t(`tool.${tool}`)}
          disabled={!canDraw && tool !== 'pan'}
        >
          <Tooltip title={t(`tool.${tool}`)}>{toolIcons[tool]}</Tooltip>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );

  const renderColorPicker = () => (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        overflowX: 'auto',
        maxWidth: '100%',
      }}
    >
      {WHITEBOARD_COLORS.map((item) => (
        <Tooltip key={item} title={item}>
          <IconButton
            size="small"
            aria-label={t('selectColor', { color: item })}
            aria-pressed={color === item}
            onClick={() => setColor(item)}
            sx={{
              width: 30,
              height: 30,
              p: 0,
              borderRadius: '50%',
              border: color === item ? '2px solid' : '2px solid transparent',
              borderColor: color === item ? 'text.primary' : 'transparent',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                bgcolor: item,
                flexShrink: 0,
              }}
            />
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  );

  const renderBrushControls = (variant: 'toolbar' | 'drawer' = 'toolbar') => {
    const isDrawer = variant === 'drawer';

    return (
      <Stack
        direction={isDrawer ? 'column' : { xs: 'column', sm: 'row' }}
        spacing={isDrawer ? 1.5 : { xs: 0.75, sm: 2.25, xl: 3 }}
        sx={{
          alignItems: isDrawer ? 'stretch' : { xs: 'stretch', sm: 'center' },
          flex: isDrawer
            ? '0 0 auto'
            : { xs: '1 1 100%', md: '1 1 360px', xl: '1 1 500px' },
          minWidth: isDrawer ? 0 : { sm: 340, xl: 500 },
          width: isDrawer ? '100%' : undefined,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            minWidth: isDrawer ? 0 : { sm: 170, xl: 230 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
          >
            {t('width')}
          </Typography>
          <Slider
            size="small"
            min={2}
            max={24}
            value={width}
            onChange={(_, value) => setWidth(value as number)}
            aria-label={t('width')}
            sx={{
              minWidth: isDrawer ? 0 : { xs: 120, xl: 180 },
              flex: isDrawer ? 1 : undefined,
            }}
          />
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            minWidth: isDrawer ? 0 : { sm: 190, xl: 250 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
          >
            {t('opacity')}
          </Typography>
          <Slider
            size="small"
            min={0.15}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(_, value) => setOpacity(value as number)}
            aria-label={t('opacity')}
            sx={{
              minWidth: isDrawer ? 0 : { xs: 120, xl: 190 },
              flex: isDrawer ? 1 : undefined,
            }}
          />
        </Stack>
      </Stack>
    );
  };

  if (stateQuery.isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={22} />
        <Typography>{t('loading')}</Typography>
      </Box>
    );
  }

  if (stateQuery.isError || !state || !whiteboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('loadError')}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 1, sm: 1.5, md: 2 },
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          useFlexGap
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              minWidth: 0,
              flex: { xs: '1 1 auto', md: '1 1 240px', xl: '0 1 280px' },
            }}
          >
            <Tooltip title={t('backToWhiteboards')}>
              <IconButton
                onClick={() =>
                  router.push(`/workspaces/${workspaceId}/whiteboards`)
                }
                aria-label={t('backToWhiteboards')}
              >
                <ArrowBack />
              </IconButton>
            </Tooltip>
            <GestureOutlined sx={{ color: whiteboard.color, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                {whiteboard.title}
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            variant="outlined"
            startIcon={<TuneOutlined />}
            onClick={() => setToolsOpen(true)}
            sx={{
              display: { xs: 'inline-flex', lg: 'none' },
              flexShrink: 0,
            }}
          >
            {t('openTools')}
          </Button>

          <Box
            sx={{
              display: { xs: 'none', lg: 'block' },
              flex: { sm: '1 1 auto', md: '0 0 auto' },
              minWidth: 0,
            }}
          >
            {renderToolPicker()}
          </Box>

          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            {renderColorPicker()}
          </Box>

          <Box
            sx={{
              display: { xs: 'none', lg: 'block' },
              flex: { md: '1 1 360px', xl: '1 1 500px' },
              minWidth: { md: 340, xl: 500 },
            }}
          >
            {renderBrushControls()}
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              flexShrink: 0,
              ml: { md: 'auto' },
            }}
          >
            <Tooltip title={t('undo')}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleUndo}
                  disabled={!canDraw}
                  aria-label={t('undo')}
                >
                  <UndoOutlined />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('redo')}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleRedo}
                  disabled={!canDraw || redoStack.length === 0}
                  aria-label={t('redo')}
                >
                  <RedoOutlined />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('exportPng')}>
              <IconButton
                size="small"
                onClick={handleExportPng}
                aria-label={t('exportPng')}
              >
                <DownloadOutlined />
              </IconButton>
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title={t('rename')}>
                  <IconButton
                    size="small"
                    onClick={handleRename}
                    aria-label={t('rename')}
                  >
                    <DriveFileRenameOutlineOutlined />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('clear')}>
                  <IconButton
                    size="small"
                    onClick={handleClear}
                    aria-label={t('clear')}
                  >
                    <DeleteSweepOutlined />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('delete')}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={handleDelete}
                      disabled={deleteWhiteboard.isPending}
                      aria-label={t('delete')}
                    >
                      <DeleteOutlineOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {isOffline && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          {t('offlineReadOnly')}
        </Alert>
      )}

      <Box
        ref={hostRef}
        sx={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <WhiteboardPixiCanvas
          operations={serverOperations}
          pendingOperations={pendingOperations}
          activeTool={activeTool}
          color={color}
          width={width}
          opacity={opacity}
          canDraw={canDraw}
          remoteCursors={remoteCursors}
          onCommitOperation={handleCommitOperation}
          onCursorMove={handleCursorMove}
          onRequestTextNote={openTextNoteDialog}
        />
      </Box>

      <Drawer
        anchor={isPhone ? 'bottom' : 'right'}
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 360 },
              maxHeight: { xs: '78dvh', sm: '100dvh' },
              borderTopLeftRadius: { xs: 8, sm: 0 },
              borderTopRightRadius: { xs: 8, sm: 0 },
            },
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('toolPanelTitle')}
            </Typography>
            <IconButton
              edge="end"
              onClick={() => setToolsOpen(false)}
              aria-label={t('close')}
            >
              <Close />
            </IconButton>
          </Stack>
          <Divider />
          {renderToolPicker()}
          {renderColorPicker()}
          {renderBrushControls('drawer')}
        </Stack>
      </Drawer>

      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('rename')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={t('whiteboardTitle')}
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') confirmRename();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={confirmRename}
            disabled={!renameTitle.trim() || updateWhiteboard.isPending}
          >
            {updateWhiteboard.isPending ? t('saving') : t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('deleteConfirm', { title: whiteboard.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteWhiteboard.isPending}
          >
            {deleteWhiteboard.isPending ? t('deleting') : t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(textNotePoint)}
        onClose={() => setTextNotePoint(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('textNoteTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            margin="dense"
            label={t('textNote')}
            value={textNoteDraft}
            onChange={(event) => setTextNoteDraft(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextNotePoint(null)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={confirmTextNote}
            disabled={!textNoteDraft.trim()}
          >
            {t('add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhiteboardCanvasPage;
