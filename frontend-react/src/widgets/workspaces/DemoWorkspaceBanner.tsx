'use client';

import { demoApi } from '@/shared/api/api';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { useAuthStore } from '@/shared/store/root.store';
import {
  KeyboardArrowDownOutlined,
  KeyboardArrowUpOutlined,
  MyLocationOutlined,
  PlayArrowOutlined,
  RefreshOutlined,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type BannerEdge = 'top' | 'right' | 'bottom' | 'left';

interface BannerPosition {
  edge: BannerEdge;
  ratio: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface BannerDragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  hasMoved: boolean;
}

const STORAGE_KEY = 'taskflow.demoWorkspaceBanner.v2';
const DEFAULT_POSITION: BannerPosition = { edge: 'bottom', ratio: 1 };
const DRAG_MOVE_THRESHOLD = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isBannerPosition = (value: unknown): value is BannerPosition => {
  const position = value as BannerPosition;
  return (
    Boolean(position) &&
    ['top', 'right', 'bottom', 'left'].includes(position.edge) &&
    typeof position.ratio === 'number' &&
    Number.isFinite(position.ratio)
  );
};

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'a, button, input, textarea, select, [role="button"], [role="menuitem"], [contenteditable="true"]',
    ),
  );

const DemoWorkspaceBanner = () => {
  const t = useTranslations('WorkspaceShell.demo');
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const { enqueueSnackbar } = useSnackbar();
  const isOffline = useIsOffline();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const suppressNextClickRef = useRef(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(true);
  const [hasLoadedPreferences, setLoadedPreferences] = useState(false);
  const [hasMeasuredBanner, setMeasuredBanner] = useState(false);
  const [position, setPosition] =
    useState<BannerPosition>(DEFAULT_POSITION);
  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [bannerSize, setBannerSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [dragState, setDragState] = useState<BannerDragState | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const resetDialogTitleId = 'demo-reset-dialog-title';
  const resetDialogDescriptionId = 'demo-reset-dialog-description';
  const isPhoneCollapsed = isPhone && isCollapsed;
  const canRenderPositionedBanner =
    hasLoadedPreferences && viewport.width > 0 && viewport.height > 0;
  const isBannerVisible = canRenderPositionedBanner && hasMeasuredBanner;
  const edgeMargin = isPhone ? 8 : 16;
  const bounds = useMemo(() => {
    const xMin = edgeMargin;
    const yMin = edgeMargin;
    const bottomMargin = isPhone ? 70 : edgeMargin;
    const width = viewport.width || 1;
    const height = viewport.height || 1;
    return {
      xMin,
      xMax: Math.max(xMin, width - bannerSize.width - edgeMargin),
      yMin,
      yMax: Math.max(yMin, height - bannerSize.height - bottomMargin),
    };
  }, [bannerSize.height, bannerSize.width, edgeMargin, isPhone, viewport]);
  const pointFromPosition = useCallback(
    (nextPosition: BannerPosition) => {
      const ratio = clamp(nextPosition.ratio, 0, 1);
      const x =
        bounds.xMin + (bounds.xMax - bounds.xMin) * ratio;
      const y =
        bounds.yMin + (bounds.yMax - bounds.yMin) * ratio;

      if (nextPosition.edge === 'top') return { x, y: bounds.yMin };
      if (nextPosition.edge === 'bottom') return { x, y: bounds.yMax };
      if (nextPosition.edge === 'left') return { x: bounds.xMin, y };
      return { x: bounds.xMax, y };
    },
    [bounds],
  );
  const positionFromPoint = useCallback(
    (point: { x: number; y: number }): BannerPosition => {
      const distances: Array<{ edge: BannerEdge; value: number }> = [
        { edge: 'top', value: Math.abs(point.y - bounds.yMin) },
        { edge: 'bottom', value: Math.abs(point.y - bounds.yMax) },
        { edge: 'left', value: Math.abs(point.x - bounds.xMin) },
        { edge: 'right', value: Math.abs(point.x - bounds.xMax) },
      ];
      const nearest = distances.reduce((best, item) =>
        item.value < best.value ? item : best,
      );
      const horizontalRange = Math.max(1, bounds.xMax - bounds.xMin);
      const verticalRange = Math.max(1, bounds.yMax - bounds.yMin);

      return {
        edge: nearest.edge,
        ratio:
          nearest.edge === 'top' || nearest.edge === 'bottom'
            ? clamp((point.x - bounds.xMin) / horizontalRange, 0, 1)
            : clamp((point.y - bounds.yMin) / verticalRange, 0, 1),
      };
    },
    [bounds],
  );
  const bannerPoint = dragPoint ?? pointFromPosition(position);
  const resetDemo = useMutation({
    mutationFn: () => demoApi.resetWorkspace().then((response) => response.data),
    onSuccess: ({ user, workspaceId, boardId }) => {
      setConfirmOpen(false);
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      enqueueSnackbar(t('resetSuccess'), { variant: 'success' });
      router.push(`/workspaces/${workspaceId}/boards/${boardId}`);
      router.refresh();
    },
    onError: (error: any) => {
      enqueueSnackbar(error.response?.data?.message ?? t('resetError'), {
        variant: 'error',
      });
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          position?: unknown;
        };
        if (isBannerPosition(parsed.position)) {
          setPosition({
            edge: parsed.position.edge,
            ratio: clamp(parsed.position.ratio, 0, 1),
          });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoadedPreferences(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (!canRenderPositionedBanner) return;
    const node = bannerRef.current;
    if (!node) return;

    const updateSize = () => {
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      setBannerSize({
        width,
        height,
      });
      if (width > 0 && height > 0) {
        setMeasuredBanner(true);
      }
    };

    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canRenderPositionedBanner, isCollapsed, isPhone]);

  useEffect(() => {
    if (!hasLoadedPreferences || typeof window === 'undefined') return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ position }),
    );
  }, [hasLoadedPreferences, position]);

  const resetPosition = () => {
    setPosition(DEFAULT_POSITION);
    setDragPoint(null);
  };

  const moveToEdge = (edge: BannerEdge) => {
    setPosition((current) => ({ edge, ratio: current.ratio }));
    setDragPoint(null);
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;

    const root = event.currentTarget;
    root.setPointerCapture(event.pointerId);
    const rect = root.getBoundingClientRect();
    setDragState({
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
    });
    setDragPoint({ x: rect.left, y: rect.top });
  };

  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const hasMoved =
      dragState.hasMoved ||
      Math.hypot(
        event.clientX - dragState.startClientX,
        event.clientY - dragState.startClientY,
      ) > DRAG_MOVE_THRESHOLD;

    if (!hasMoved) return;

    if (!dragState.hasMoved) {
      setDragState((current) =>
        current && current.pointerId === dragState.pointerId
          ? { ...current, hasMoved: true }
          : current,
      );
    }

    setDragPoint({
      x: clamp(event.clientX - dragState.offsetX, bounds.xMin, bounds.xMax),
      y: clamp(event.clientY - dragState.offsetY, bounds.yMin, bounds.yMax),
    });
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const root = event.currentTarget;
    if (root.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId);
    }
    const wasDragged =
      dragState.hasMoved ||
      Math.hypot(
        event.clientX - dragState.startClientX,
        event.clientY - dragState.startClientY,
      ) > DRAG_MOVE_THRESHOLD;

    if (wasDragged) {
      const nextPoint = dragPoint ?? pointFromPosition(position);
      setPosition(positionFromPoint(nextPoint));
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    }

    setDragPoint(null);
    setDragState(null);
  };

  const handleDragKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveToEdge('top');
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveToEdge('bottom');
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveToEdge('left');
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveToEdge('right');
    }
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressNextClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  };

  if (!canRenderPositionedBanner) return null;

  return (
    <>
      <Box
        ref={(node: HTMLDivElement | null) => {
          bannerRef.current = node;
        }}
        role="region"
        aria-label={t('regionLabel')}
        tabIndex={0}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={handleDragKeyDown}
        onClickCapture={handleClickCapture}
        sx={{
          position: 'fixed',
          left: bannerPoint.x,
          top: bannerPoint.y,
          visibility: isBannerVisible ? 'visible' : 'hidden',
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
          maxWidth: {
            xs: 'calc(100vw - 16px)',
            sm: 'min(800px, calc(100vw - 32px))',
          },
          border: '1px solid',
          borderColor: alpha(theme.palette.warning.main, 0.34),
          borderRadius: 1,
          bgcolor: alpha(
            theme.palette.warning.main,
            theme.palette.mode === 'dark' ? 0.18 : 0.12,
          ),
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 12px 28px rgba(0,0,0,0.32)'
              : '0 10px 24px rgba(15,23,42,0.14)',
          backdropFilter: 'blur(10px)',
          px: { xs: 0.5, sm: 0.75 },
          py: { xs: 0.5, sm: 0.75 },
          cursor: dragState ? 'grabbing' : 'grab',
          outline: 'none',
          touchAction: 'none',
          userSelect: dragState ? 'none' : 'auto',
          transition: dragState || !isBannerVisible
            ? 'none'
            : 'left 0.16s ease, top 0.16s ease, box-shadow 0.16s ease',
        }}
      >
        <Stack
          direction="row"
          spacing={isPhoneCollapsed ? 0.5 : { xs: 0.75, sm: 1 }}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 0,
          }}
        >
          {!isPhoneCollapsed && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 auto' }}
            >
              <Chip
                size="small"
                color="warning"
                icon={<PlayArrowOutlined />}
                label={t('chip')}
                sx={{ flexShrink: 0, borderRadius: 1 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{
                  display:
                    isCollapsed || isPhone
                      ? 'none'
                      : { xs: 'none', md: 'block' },
                }}
              >
                {t('description')}
              </Typography>
            </Stack>
          )}

          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1 }}
            sx={{
              alignItems: 'center',
              flexWrap: 'nowrap',
              flexShrink: 0,
            }}
          >
            {!isPhoneCollapsed && (
              <Tooltip title={t('resetPosition')}>
                <IconButton
                  size="small"
                  aria-label={t('resetPosition')}
                  onClick={resetPosition}
                  sx={{
                    width: { xs: 36, sm: 34 },
                    height: { xs: 36, sm: 34 },
                    cursor: 'pointer',
                  }}
                >
                  <MyLocationOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={isCollapsed ? t('expand') : t('collapse')}>
              <IconButton
                size="small"
                aria-label={isCollapsed ? t('expand') : t('collapse')}
                onClick={() => setCollapsed((current) => !current)}
                sx={{
                  width: { xs: 36, sm: 34 },
                  height: { xs: 36, sm: 34 },
                  cursor: 'pointer',
                }}
              >
                {isCollapsed ? (
                  <KeyboardArrowUpOutlined fontSize="small" />
                ) : (
                  <KeyboardArrowDownOutlined fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              color="warning"
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={() => setConfirmOpen(true)}
              disabled={isOffline}
              sx={{
                minWidth: { xs: 92, sm: 'max-content' },
                minHeight: { xs: 40, sm: 34 },
                px: { xs: 1.25, sm: 1.25 },
                flexShrink: 0,
                cursor: isOffline ? 'default' : 'pointer',
              }}
            >
              {t('reset')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Dialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby={resetDialogTitleId}
        aria-describedby={resetDialogDescriptionId}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id={resetDialogTitleId}>{t('resetTitle')}</DialogTitle>
        <DialogContent>
          <Typography
            id={resetDialogDescriptionId}
            variant="body2"
            color="text.secondary"
          >
            {t('resetDescription')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setConfirmOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => resetDemo.mutate()}
            disabled={resetDemo.isPending || isOffline}
          >
            {resetDemo.isPending ? t('resetting') : t('resetConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DemoWorkspaceBanner;
