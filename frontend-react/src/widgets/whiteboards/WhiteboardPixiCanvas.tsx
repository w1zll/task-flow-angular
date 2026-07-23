'use client';

import type { RemoteWhiteboardCursor } from '@/shared/hooks/useWhiteboardSocket';
import type {
  WhiteboardOperation,
  WhiteboardOperationType,
} from '@/shared/api/api';
import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  ShapeOperationData,
  StrokeOperationData,
  TextOperationData,
  WhiteboardPoint,
  WhiteboardTool,
  getVisibleOperations,
  hexToNumber,
  isMoveData,
  isShapeData,
  isStrokeData,
  isTextData,
} from './whiteboard-drawing';
import { Box } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface DraftStroke {
  type: 'stroke';
  points: WhiteboardPoint[];
}

interface DraftShape {
  type: 'shape';
  from: WhiteboardPoint;
  to: WhiteboardPoint;
}

interface DraftTextMove {
  type: 'textMove';
  operationId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

type Draft = DraftStroke | DraftShape | DraftTextMove | null;

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  operations: WhiteboardOperation[];
  pendingOperations: WhiteboardOperation[];
  activeTool: WhiteboardTool;
  color: string;
  width: number;
  opacity: number;
  canDraw: boolean;
  remoteCursors: Record<string, RemoteWhiteboardCursor>;
  onCommitOperation: (
    type: WhiteboardOperationType,
    data: Record<string, unknown>,
  ) => void;
  onCursorMove: (point: WhiteboardPoint) => void;
  onRequestTextNote: (point: WhiteboardPoint) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distance = (a: WhiteboardPoint, b: WhiteboardPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const toWorld = (
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  canvas: HTMLCanvasElement,
  view: ViewState,
): WhiteboardPoint => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - view.x) / view.scale,
    y: (event.clientY - rect.top - view.y) / view.scale,
  };
};

const getEventCenter = (
  pointers: Map<number, { clientX: number; clientY: number }>,
) => {
  const values = Array.from(pointers.values());
  const x = values.reduce((sum, point) => sum + point.clientX, 0) / values.length;
  const y = values.reduce((sum, point) => sum + point.clientY, 0) / values.length;
  return { x, y };
};

const getPointerDistance = (
  pointers: Map<number, { clientX: number; clientY: number }>,
) => {
  const [first, second] = Array.from(pointers.values());
  if (!first || !second) return 0;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

const freeLineTools = new Set<WhiteboardTool>(['pen', 'highlighter', 'eraser']);

const getCanvasPalette = (theme: Theme) =>
  theme.palette.mode === 'dark'
    ? {
        background: theme.palette.background.default,
        grid: 0x3c4043,
        gridAlpha: 0.62,
        cursorLabel: theme.palette.text.primary,
        cursorBorder: 0x9aa0a6,
        noteBackground: hexToNumber(theme.palette.background.paper, 0x292a2d),
        noteBorder: hexToNumber(theme.palette.primary.main, 0x6aac6a),
        noteText: theme.palette.text.primary,
      }
    : {
        background: theme.palette.background.default,
        grid: 0xe5e7eb,
        gridAlpha: 0.7,
        cursorLabel: theme.palette.text.primary,
        cursorBorder: 0x94a3b8,
        noteBackground: hexToNumber(theme.palette.background.paper, 0xffffff),
        noteBorder: hexToNumber(theme.palette.primary.main, 0x669266),
        noteText: theme.palette.text.primary,
      };

type CanvasPalette = ReturnType<typeof getCanvasPalette>;

const styleForStroke = (data: StrokeOperationData) => ({
  width: data.tool === 'eraser' ? data.width * 2.2 : data.width,
  color: hexToNumber(data.color),
  alpha: data.tool === 'highlighter' ? Math.min(data.opacity, 0.35) : data.opacity,
  cap: 'round' as const,
  join: 'round' as const,
});

interface EraserPath {
  sequence: number;
  points: WhiteboardPoint[];
  radius: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const distanceToSegment = (
  point: WhiteboardPoint,
  from: WhiteboardPoint,
  to: WhiteboardPoint,
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(point, from);

  const t = clamp(
    ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq,
    0,
    1,
  );
  return distance(point, {
    x: from.x + t * dx,
    y: from.y + t * dy,
  });
};

const isPointInsideEraser = (point: WhiteboardPoint, erasers: EraserPath[]) =>
  erasers.some((eraser) => {
    if (
      point.x < eraser.minX ||
      point.x > eraser.maxX ||
      point.y < eraser.minY ||
      point.y > eraser.maxY
    ) {
      return false;
    }
    if (
      eraser.points.some(
        (eraserPoint) => distance(point, eraserPoint) <= eraser.radius,
      )
    ) {
      return true;
    }
    for (let index = 1; index < eraser.points.length; index += 1) {
      if (
        distanceToSegment(
          point,
          eraser.points[index - 1],
          eraser.points[index],
        ) <= eraser.radius
      ) {
        return true;
      }
    }
    return false;
  });

const isSegmentErased = (
  from: WhiteboardPoint,
  to: WhiteboardPoint,
  erasers: EraserPath[],
) => {
  if (!erasers.length) return false;
  const mid = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  return (
    isPointInsideEraser(from, erasers) ||
    isPointInsideEraser(mid, erasers) ||
    isPointInsideEraser(to, erasers)
  );
};

const toEraserPath = (
  sequence: number,
  data: StrokeOperationData,
): EraserPath => {
  const radius = Math.max(4, data.width * 1.1);
  const xs = data.points.map((point) => point.x);
  const ys = data.points.map((point) => point.y);

  return {
    sequence,
    points: data.points,
    radius,
    minX: Math.min(...xs) - radius,
    maxX: Math.max(...xs) + radius,
    minY: Math.min(...ys) - radius,
    maxY: Math.max(...ys) + radius,
  };
};

const drawEraserPreview = (
  container: Container,
  data: StrokeOperationData,
  previewColor: number,
) => {
  if (data.points.length < 2) return;
  const graphic = new Graphics();
  graphic.moveTo(data.points[0].x, data.points[0].y);
  data.points.slice(1).forEach((point) => {
    graphic.lineTo(point.x, point.y);
  });
  graphic.stroke({
    width: Math.max(6, data.width * 2.2),
    color: previewColor,
    alpha: 0.42,
    cap: 'round',
    join: 'round',
  });
  container.addChild(graphic);
};

const drawStroke = (
  container: Container,
  data: StrokeOperationData,
  erasers: EraserPath[] = [],
) => {
  if (data.tool === 'eraser') return;
  if (data.points.length < 2) return;
  const graphic = new Graphics();

  let hasVisibleSegment = false;
  let isDrawing = false;
  for (let index = 1; index < data.points.length; index += 1) {
    const from = data.points[index - 1];
    const to = data.points[index];
    if (isSegmentErased(from, to, erasers)) {
      isDrawing = false;
      continue;
    }
    if (!isDrawing) {
      graphic.moveTo(from.x, from.y);
      isDrawing = true;
    }
    graphic.lineTo(to.x, to.y);
    hasVisibleSegment = true;
  }

  if (hasVisibleSegment) {
    graphic.stroke(styleForStroke(data));
    container.addChild(graphic);
  } else {
    graphic.destroy();
  }
};

const isAppendOnlyRenderOperation = (operation: WhiteboardOperation) => {
  if (operation.type === 'stroke' && isStrokeData(operation.data)) {
    return operation.data.tool !== 'eraser';
  }
  return (
    (operation.type === 'shape' && isShapeData(operation.data)) ||
    (operation.type === 'text' && isTextData(operation.data))
  );
};

const drawArrowHead = (
  graphic: Graphics,
  from: WhiteboardPoint,
  to: WhiteboardPoint,
) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 16;
  const left = {
    x: to.x - Math.cos(angle - Math.PI / 6) * size,
    y: to.y - Math.sin(angle - Math.PI / 6) * size,
  };
  const right = {
    x: to.x - Math.cos(angle + Math.PI / 6) * size,
    y: to.y - Math.sin(angle + Math.PI / 6) * size,
  };
  graphic.moveTo(left.x, left.y).lineTo(to.x, to.y).lineTo(right.x, right.y);
};

const drawShape = (container: Container, data: ShapeOperationData) => {
  const graphic = new Graphics();
  const stroke = {
    width: data.width,
    color: hexToNumber(data.color),
    alpha: data.opacity,
    cap: 'round' as const,
    join: 'round' as const,
  };

  if (data.shape === 'rectangle') {
    graphic
      .rect(
        Math.min(data.from.x, data.to.x),
        Math.min(data.from.y, data.to.y),
        Math.abs(data.to.x - data.from.x),
        Math.abs(data.to.y - data.from.y),
      )
      .stroke(stroke);
  } else {
    graphic.moveTo(data.from.x, data.from.y).lineTo(data.to.x, data.to.y);
    if (data.shape === 'arrow') drawArrowHead(graphic, data.from, data.to);
    graphic.stroke(stroke);
  }

  container.addChild(graphic);
};

const isShapeErased = (data: ShapeOperationData, erasers: EraserPath[]) => {
  if (!erasers.length) return false;
  if (data.shape !== 'rectangle') {
    return isSegmentErased(data.from, data.to, erasers);
  }

  const left = Math.min(data.from.x, data.to.x);
  const right = Math.max(data.from.x, data.to.x);
  const top = Math.min(data.from.y, data.to.y);
  const bottom = Math.max(data.from.y, data.to.y);
  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];

  return corners.some((corner, index) =>
    isSegmentErased(corner, corners[(index + 1) % corners.length], erasers),
  );
};

const drawText = (
  container: Container,
  data: TextOperationData,
  palette: CanvasPalette,
) => {
  const label = new Text({
    text: data.text,
    style: {
      fill: palette.noteText,
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 18,
      wordWrap: true,
      wordWrapWidth: 260,
    },
  });
  label.x = data.x + 12;
  label.y = data.y + 10;

  const background = new Graphics()
    .roundRect(
      data.x,
      data.y,
      Math.max(120, label.width + 24),
      label.height + 20,
      6,
    )
    .fill({ color: palette.noteBackground, alpha: 0.96 })
    .stroke({ color: palette.noteBorder, alpha: 0.9, width: 1.5 });

  container.addChild(background, label);
};

const getTextBounds = (data: TextOperationData) => ({
  x: data.x,
  y: data.y,
  width: Math.max(120, Math.min(300, data.text.length * 9 + 36)),
  height: Math.max(44, Math.ceil(data.text.length / 28) * 24 + 22),
});

const isTextErased = (data: TextOperationData, erasers: EraserPath[]) => {
  if (!erasers.length) return false;
  const bounds = getTextBounds(data);
  const points = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
    {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
  ];
  return (
    points.some((point) => isPointInsideEraser(point, erasers)) ||
    erasers.some((eraser) =>
      eraser.points.some(
        (point) =>
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height,
      ),
    )
  );
};

const findTextOperationAt = (
  operations: WhiteboardOperation[],
  point: WhiteboardPoint,
) => {
  return [...operations].reverse().find((operation) => {
    if (operation.type !== 'text' || !isTextData(operation.data)) return false;
    const bounds = getTextBounds(operation.data);
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  });
};

const clearContainer = (container: Container) => {
  container.removeChildren().forEach((child) => child.destroy());
};

const WhiteboardPixiCanvas = ({
  operations,
  pendingOperations,
  activeTool,
  color,
  width,
  opacity,
  canDraw,
  remoteCursors,
  onCommitOperation,
  onCursorMove,
  onRequestTextNote,
}: Props) => {
  const theme = useTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Container | null>(null);
  const gridLayerRef = useRef<Graphics | null>(null);
  const contentLayerRef = useRef<Container | null>(null);
  const pendingLayerRef = useRef<Container | null>(null);
  const draftLayerRef = useRef<Container | null>(null);
  const cursorLayerRef = useRef<Container | null>(null);
  const brushCursorRef = useRef<HTMLDivElement | null>(null);
  const renderedContentRef = useRef<{
    operationIds: string[];
    hiddenOperationKey: string;
    paletteKey: string;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const panRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    view: ViewState;
  } | null>(null);
  const gestureRef = useRef<{
    distance: number;
    center: { x: number; y: number };
    view: ViewState;
  } | null>(null);
  const [view, setView] = useState<ViewState>({ x: 140, y: 90, scale: 1 });
  const [draft, setDraft] = useState<Draft>(null);
  const [isTextHover, setTextHover] = useState(false);
  const [isPixiReady, setPixiReady] = useState(false);
  const viewRef = useRef(view);
  const canvasPalette = useMemo(() => getCanvasPalette(theme), [theme]);
  const pendingTextMoveTargetKey = useMemo(
    () =>
      pendingOperations
        .filter(
          (
            operation,
          ): operation is WhiteboardOperation & {
            data: { targetOperationId: string };
          } => operation.type === 'move' && isMoveData(operation.data),
        )
        .map((operation) => operation.data.targetOperationId)
        .sort()
        .join('|'),
    [pendingOperations],
  );

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const hideBrushCursor = useCallback(() => {
    if (brushCursorRef.current) {
      brushCursorRef.current.style.display = 'none';
    }
  }, []);

  const updateBrushCursor = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const cursor = brushCursorRef.current;
      if (!cursor) return;
      if (
        event.pointerType === 'touch' ||
        !canDraw ||
        !freeLineTools.has(activeTool)
      ) {
        cursor.style.display = 'none';
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const strokeWidth =
        activeTool === 'eraser' ? Math.max(6, width * 2.2) : width;
      const diameter = clamp(strokeWidth * viewRef.current.scale, 4, 96);
      cursor.style.display = 'block';
      cursor.style.width = `${diameter}px`;
      cursor.style.height = `${diameter}px`;
      cursor.style.borderColor =
        activeTool === 'eraser' ? canvasPalette.cursorLabel : color;
      cursor.style.backgroundColor =
        activeTool === 'highlighter' ? `${color}33` : 'transparent';
      cursor.style.transform = `translate3d(${
        event.clientX - rect.left - diameter / 2
      }px, ${event.clientY - rect.top - diameter / 2}px, 0)`;
    },
    [activeTool, canDraw, canvasPalette.cursorLabel, color, width],
  );

  useEffect(() => {
    if (!canDraw || !freeLineTools.has(activeTool)) hideBrushCursor();
  }, [activeTool, canDraw, hideBrushCursor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let isMounted = true;
    const app = new Application();

    const init = async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 1,
        backgroundColor: 0xf8fafc,
        antialias: true,
        autoDensity: true,
        resolution:
          typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
        preference: 'webgl',
        preserveDrawingBuffer: true,
      });
      if (!isMounted) {
        app.destroy(true, { children: true });
        return;
      }

      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.display = 'block';
      app.canvas.style.position = 'absolute';
      app.canvas.style.inset = '0';
      app.canvas.style.zIndex = '0';
      app.canvas.style.touchAction = 'none';
      host.appendChild(app.canvas);

      const viewport = new Container();
      const grid = new Graphics();
      const content = new Container({ isRenderGroup: true });
      const pendingLayer = new Container();
      const draftLayer = new Container();
      const cursors = new Container();
      viewport.addChild(grid, content, pendingLayer, draftLayer, cursors);
      app.stage.addChild(viewport);

      appRef.current = app;
      viewportRef.current = viewport;
      gridLayerRef.current = grid;
      contentLayerRef.current = content;
      pendingLayerRef.current = pendingLayer;
      draftLayerRef.current = draftLayer;
      cursorLayerRef.current = cursors;
      setPixiReady(true);
      app.render();
    };

    void init();

    return () => {
      isMounted = false;
      appRef.current = null;
      viewportRef.current = null;
      gridLayerRef.current = null;
      contentLayerRef.current = null;
      pendingLayerRef.current = null;
      draftLayerRef.current = null;
      cursorLayerRef.current = null;
      renderedContentRef.current = null;
      setPixiReady(false);
      app.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const grid = gridLayerRef.current;
    const app = appRef.current;
    if (!isPixiReady || !app || !viewport || !grid) return;

    viewport.position.set(view.x, view.y);
    viewport.scale.set(view.scale);
    app.renderer.background.color = hexToNumber(
      canvasPalette.background,
      0xf8fafc,
    );
    app.renderer.background.alpha = 1;

    grid.clear();
    for (let position = -5000; position <= 5000; position += 48) {
      grid.moveTo(position, -5000).lineTo(position, 5000);
      grid.moveTo(-5000, position).lineTo(5000, position);
    }
    grid.stroke({
      width: 1,
      color: canvasPalette.grid,
      alpha: canvasPalette.gridAlpha,
    });
    app.render();
  }, [canvasPalette, isPixiReady, view]);

  const textMoveOperationId =
    draft?.type === 'textMove' ? draft.operationId : null;
  const hiddenOperationKey = useMemo(
    () =>
      [textMoveOperationId, pendingTextMoveTargetKey]
        .filter(Boolean)
        .join('|'),
    [pendingTextMoveTargetKey, textMoveOperationId],
  );
  const interactionOperations = useMemo(
    () => getVisibleOperations([...operations, ...pendingOperations]),
    [operations, pendingOperations],
  );

  useEffect(() => {
    const content = contentLayerRef.current;
    const app = appRef.current;
    if (!isPixiReady || !app || !content) return;

    const operationIds = operations.map((operation) => operation.id);
    const paletteKey = [
      canvasPalette.noteBackground,
      canvasPalette.noteBorder,
      canvasPalette.noteText,
    ].join(':');
    const previousContent = renderedContentRef.current;
    const hasSameBase =
      Boolean(previousContent) &&
      previousContent?.hiddenOperationKey === hiddenOperationKey &&
      previousContent.paletteKey === paletteKey &&
      previousContent.operationIds.length <= operationIds.length &&
      previousContent.operationIds.every(
        (operationId, index) => operationIds[index] === operationId,
      );
    const additions = previousContent
      ? operations.slice(previousContent.operationIds.length)
      : [];

    if (hasSameBase && previousContent?.operationIds.length === operationIds.length) {
      return;
    }

    if (
      hasSameBase &&
      additions.length > 0 &&
      additions.every(isAppendOnlyRenderOperation)
    ) {
      additions.forEach((operation) => {
        if (operation.type === 'stroke' && isStrokeData(operation.data)) {
          drawStroke(content, operation.data);
        }
        if (operation.type === 'shape' && isShapeData(operation.data)) {
          drawShape(content, operation.data);
        }
        if (operation.type === 'text' && isTextData(operation.data)) {
          drawText(content, operation.data, canvasPalette);
        }
      });
      renderedContentRef.current = {
        operationIds,
        hiddenOperationKey,
        paletteKey,
      };
      app.render();
      return;
    }

    clearContainer(content);
    const hiddenOperationIds = new Set(
      hiddenOperationKey.split('|').filter(Boolean),
    );
    const visibleOperations = getVisibleOperations(operations).filter(
      (operation) => !hiddenOperationIds.has(operation.id),
    );
    const erasers = visibleOperations
      .filter(
        (
          operation,
        ): operation is WhiteboardOperation & { data: StrokeOperationData } =>
          operation.type === 'stroke' &&
          isStrokeData(operation.data) &&
          operation.data.tool === 'eraser',
      )
      .map((operation) => toEraserPath(operation.sequence, operation.data));
    const getErasersAfter = (sequence: number) =>
      erasers.filter((eraser) => eraser.sequence > sequence);

    visibleOperations.forEach((operation) => {
      if (operation.type === 'stroke' && isStrokeData(operation.data)) {
        drawStroke(
          content,
          operation.data,
          getErasersAfter(operation.sequence),
        );
      }
      if (operation.type === 'shape' && isShapeData(operation.data)) {
        if (!isShapeErased(operation.data, getErasersAfter(operation.sequence))) {
          drawShape(content, operation.data);
        }
      }
      if (operation.type === 'text' && isTextData(operation.data)) {
        if (!isTextErased(operation.data, getErasersAfter(operation.sequence))) {
          drawText(content, operation.data, canvasPalette);
        }
      }
    });

    renderedContentRef.current = {
      operationIds,
      hiddenOperationKey,
      paletteKey,
    };
    app.render();
  }, [canvasPalette, hiddenOperationKey, isPixiReady, operations]);

  useEffect(() => {
    const draftLayer = draftLayerRef.current;
    const app = appRef.current;
    if (!isPixiReady || !app || !draftLayer) return;

    clearContainer(draftLayer);

    if (draft?.type === 'stroke' && activeTool !== 'eraser') {
      drawStroke(draftLayer, {
        tool: activeTool === 'highlighter' ? activeTool : 'pen',
        points: draft.points,
        color,
        width,
        opacity,
      });
    }
    if (draft?.type === 'stroke' && activeTool === 'eraser') {
      drawEraserPreview(
        draftLayer,
        {
          tool: 'eraser',
          points: draft.points,
          color,
          width,
          opacity,
        },
        canvasPalette.grid,
      );
    }
    if (draft?.type === 'shape') {
      drawShape(draftLayer, {
        shape:
          activeTool === 'rectangle'
            ? 'rectangle'
            : activeTool === 'arrow'
              ? 'arrow'
              : 'line',
        from: draft.from,
        to: draft.to,
        color,
        width,
        opacity,
      });
    }
    if (draft?.type === 'textMove') {
      const target = interactionOperations.find(
        (operation) =>
          operation.id === draft.operationId &&
          operation.type === 'text' &&
          isTextData(operation.data),
      );
      if (target && isTextData(target.data)) {
        drawText(
          draftLayer,
          {
            ...target.data,
            x: draft.x,
            y: draft.y,
          },
          canvasPalette,
        );
      }
    }

    app.render();
  }, [
    activeTool,
    canvasPalette,
    color,
    draft,
    interactionOperations,
    isPixiReady,
    opacity,
    width,
  ]);

  useEffect(() => {
    const pendingLayer = pendingLayerRef.current;
    const app = appRef.current;
    if (!isPixiReady || !app || !pendingLayer) return;

    clearContainer(pendingLayer);
    if (!pendingOperations.length) {
      app.render();
      return;
    }

    const confirmedVisibleOperations = getVisibleOperations(operations);
    pendingOperations.forEach((operation) => {
      if (operation.type === 'stroke' && isStrokeData(operation.data)) {
        if (operation.data.tool === 'eraser') {
          drawEraserPreview(pendingLayer, operation.data, canvasPalette.grid);
        } else {
          drawStroke(pendingLayer, operation.data);
        }
      }
      if (operation.type === 'shape' && isShapeData(operation.data)) {
        drawShape(pendingLayer, operation.data);
      }
      if (operation.type === 'text' && isTextData(operation.data)) {
        drawText(pendingLayer, operation.data, canvasPalette);
      }
      if (operation.type === 'move' && isMoveData(operation.data)) {
        const target = confirmedVisibleOperations.find(
          (item) =>
            item.id === operation.data.targetOperationId &&
            item.type === 'text' &&
            isTextData(item.data),
        );
        if (target && isTextData(target.data)) {
          drawText(
            pendingLayer,
            {
              ...target.data,
              x: operation.data.x,
              y: operation.data.y,
            },
            canvasPalette,
          );
        }
      }
    });

    app.render();
  }, [canvasPalette, isPixiReady, operations, pendingOperations]);

  useEffect(() => {
    const cursors = cursorLayerRef.current;
    const app = appRef.current;
    if (!isPixiReady || !app || !cursors) return;

    clearContainer(cursors);
    Object.values(remoteCursors).forEach((cursor) => {
      const cursorGroup = new Container();
      cursorGroup.position.set(cursor.x, cursor.y);
      cursorGroup.scale.set(1 / view.scale);
      const cursorGraphic = new Graphics()
        .moveTo(1, 1)
        .lineTo(19, 8)
        .lineTo(7, 18)
        .closePath()
        .fill({ color: hexToNumber(cursor.color ?? '#2563eb'), alpha: 0.92 })
        .stroke({
          color: canvasPalette.cursorBorder,
          alpha: 0.95,
          width: 1.4,
          join: 'round',
        });
      const label = new Text({
        text: cursor.userName ?? cursor.tool ?? 'cursor',
        style: {
          fill: canvasPalette.cursorLabel,
          fontSize: 12,
          fontFamily: 'Inter, Arial, sans-serif',
        },
      });
      label.x = 18;
      label.y = 12;
      cursorGroup.addChild(cursorGraphic, label);
      cursors.addChild(cursorGroup);
    });
    app.render();
  }, [canvasPalette, isPixiReady, remoteCursors, view.scale]);

  const startGesture = useCallback(() => {
    const pointers = pointersRef.current;
    if (pointers.size < 2) return;
    gestureRef.current = {
      distance: getPointerDistance(pointers),
      center: getEventCenter(pointers),
      view: viewRef.current,
    };
    setDraft(null);
    panRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const canvas = appRef.current?.canvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      updateBrushCursor(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (pointersRef.current.size >= 2) {
        startGesture();
        return;
      }

      const isPan = activeTool === 'pan' || !canDraw || event.button === 1;
      if (isPan) {
        panRef.current = {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          view: viewRef.current,
        };
        return;
      }

      const point = toWorld(event.nativeEvent, canvas, viewRef.current);
      onCursorMove(point);

      if (activeTool === 'text') {
        const target = findTextOperationAt(interactionOperations, point);
        if (target && isTextData(target.data)) {
          setDraft({
            type: 'textMove',
            operationId: target.id,
            startX: target.data.x,
            startY: target.data.y,
            x: target.data.x,
            y: target.data.y,
            offsetX: point.x - target.data.x,
            offsetY: point.y - target.data.y,
          });
        } else {
          onRequestTextNote(point);
        }
        return;
      }

      if (['line', 'rectangle', 'arrow'].includes(activeTool)) {
        setDraft({ type: 'shape', from: point, to: point });
        return;
      }

      setDraft({ type: 'stroke', points: [point] });
    },
    [
      activeTool,
      canDraw,
      onCursorMove,
      onRequestTextNote,
      interactionOperations,
      startGesture,
      updateBrushCursor,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const canvas = appRef.current?.canvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      updateBrushCursor(event);
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }

      if (gestureRef.current && pointersRef.current.size >= 2) {
        const gesture = gestureRef.current;
        const nextCenter = getEventCenter(pointersRef.current);
        const nextDistance = getPointerDistance(pointersRef.current);
        const nextScale = clamp(
          gesture.view.scale * (nextDistance / Math.max(1, gesture.distance)),
          0.25,
          3,
        );
        setView({
          x: gesture.view.x + nextCenter.x - gesture.center.x,
          y: gesture.view.y + nextCenter.y - gesture.center.y,
          scale: nextScale,
        });
        return;
      }

      if (panRef.current?.pointerId === event.pointerId) {
        const pan = panRef.current;
        setView({
          ...pan.view,
          x: pan.view.x + event.clientX - pan.clientX,
          y: pan.view.y + event.clientY - pan.clientY,
        });
        return;
      }

      const point = toWorld(event.nativeEvent, canvas, viewRef.current);
      onCursorMove(point);
      if (activeTool === 'text' && !draft) {
        setTextHover(Boolean(findTextOperationAt(interactionOperations, point)));
      } else if (isTextHover) {
        setTextHover(false);
      }
      setDraft((current) => {
        if (!current) return current;
        if (current.type === 'shape') return { ...current, to: point };
        if (current.type === 'textMove') {
          return {
            ...current,
            x: point.x - current.offsetX,
            y: point.y - current.offsetY,
          };
        }
        const last = current.points[current.points.length - 1];
        if (last && distance(last, point) < 2) return current;
        return { ...current, points: [...current.points, point] };
      });
    },
    [
      activeTool,
      draft,
      interactionOperations,
      isTextHover,
      onCursorMove,
      updateBrushCursor,
    ],
  );

  const commitDraft = useCallback(() => {
    setDraft((current) => {
      if (!current) return current;
      if (current.type === 'stroke' && current.points.length > 1) {
        onCommitOperation('stroke', {
          tool:
            activeTool === 'highlighter' || activeTool === 'eraser'
              ? activeTool
              : 'pen',
          points: current.points,
          color,
          width,
          opacity,
        });
      }
      if (current.type === 'shape') {
        onCommitOperation('shape', {
          shape:
            activeTool === 'rectangle'
              ? 'rectangle'
              : activeTool === 'arrow'
                ? 'arrow'
                : 'line',
          from: current.from,
          to: current.to,
          color,
          width,
          opacity,
        });
      }
      if (current.type === 'textMove') {
        if (
          Math.hypot(current.x - current.startX, current.y - current.startY) >
          0.5
        ) {
          onCommitOperation('move', {
            targetOperationId: current.operationId,
            x: current.x,
            y: current.y,
          });
        }
      }
      return null;
    });
  }, [activeTool, color, onCommitOperation, opacity, width]);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) gestureRef.current = null;
      if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
      commitDraft();
      setTextHover(false);
    },
    [commitDraft],
  );

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const canvas = appRef.current?.canvas as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const current = viewRef.current;
    const rect = canvas.getBoundingClientRect();
    const cursor = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const world = {
      x: (cursor.x - current.x) / current.scale,
      y: (cursor.y - current.y) / current.scale,
    };
    const nextScale = clamp(
      current.scale * (event.deltaY > 0 ? 0.9 : 1.1),
      0.25,
      3,
    );
    setView({
      x: cursor.x - world.x * nextScale,
      y: cursor.y - world.y * nextScale,
      scale: nextScale,
    });
  }, []);

  return (
    <Box
      ref={hostRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        setTextHover(false);
        hideBrushCursor();
      }}
      onWheel={handleWheel}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        cursor:
          activeTool === 'pan' || !canDraw
            ? 'grab'
            : activeTool === 'text'
              ? draft?.type === 'textMove'
                ? 'grabbing'
                : isTextHover
                  ? 'grab'
                  : 'crosshair'
              : freeLineTools.has(activeTool)
                ? 'none'
              : 'crosshair',
        bgcolor: canvasPalette.background,
        touchAction: 'none',
      }}
    >
      <Box
        ref={brushCursorRef}
        aria-hidden
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          display: 'none',
          border: '1.5px solid',
          borderRadius: '50%',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          boxShadow: (theme) =>
            `0 0 0 1px ${theme.palette.background.default}`,
          willChange: 'transform, width, height',
        }}
      />
    </Box>
  );
};

export default WhiteboardPixiCanvas;
