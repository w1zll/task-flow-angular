import type { WhiteboardOperation } from '@/shared/api/api';

export type WhiteboardTool =
  | 'pan'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'arrow'
  | 'text';

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface StrokeOperationData {
  tool: 'pen' | 'highlighter' | 'eraser';
  points: WhiteboardPoint[];
  color: string;
  width: number;
  opacity: number;
}

export interface ShapeOperationData {
  shape: 'line' | 'rectangle' | 'arrow';
  from: WhiteboardPoint;
  to: WhiteboardPoint;
  color: string;
  width: number;
  opacity: number;
}

export interface TextOperationData {
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface UndoRedoOperationData {
  targetOperationId: string;
}

export interface MoveOperationData {
  targetOperationId: string;
  x: number;
  y: number;
}

export const WHITEBOARD_COLORS = [
  '#1f2937',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#f59e0b',
  '#0891b2',
  '#db2777',
];

export const hexToNumber = (value: string, fallback = 0x1f2937) => {
  const normalized = value.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return fallback;
  return Number.parseInt(normalized, 16);
};

const isPoint = (value: unknown): value is WhiteboardPoint => {
  const point = value as WhiteboardPoint;
  return (
    Boolean(point) &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
};

export const isStrokeData = (
  value: unknown,
): value is StrokeOperationData => {
  const data = value as Record<string, unknown>;
  return (
    ['pen', 'highlighter', 'eraser'].includes(String(data.tool)) &&
    Array.isArray(data.points) &&
    data.points.every(isPoint)
  );
};

export const isShapeData = (
  value: unknown,
): value is ShapeOperationData => {
  const data = value as Record<string, unknown>;
  return (
    ['line', 'rectangle', 'arrow'].includes(String(data.shape)) &&
    isPoint(data.from) &&
    isPoint(data.to)
  );
};

export const isTextData = (
  value: unknown,
): value is TextOperationData => {
  const data = value as Record<string, unknown>;
  return (
    typeof data.text === 'string' &&
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    Number.isFinite(data.x) &&
    Number.isFinite(data.y)
  );
};

export const isUndoRedoData = (
  value: unknown,
): value is UndoRedoOperationData =>
  typeof (value as Record<string, unknown>).targetOperationId === 'string';

export const isMoveData = (value: unknown): value is MoveOperationData => {
  const data = value as Record<string, unknown>;
  return (
    typeof data.targetOperationId === 'string' &&
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    Number.isFinite(data.x) &&
    Number.isFinite(data.y)
  );
};

export const getOperationsFromState = (
  snapshotOperations: WhiteboardOperation[] | undefined,
  operations: WhiteboardOperation[],
) =>
  [...(snapshotOperations ?? []), ...operations].sort(
    (a, b) => a.sequence - b.sequence,
  );

export const getVisibleOperations = (operations: WhiteboardOperation[]) => {
  const afterLastClear: WhiteboardOperation[] = [];
  const undone = new Set<string>();
  const moved = new Map<string, { x: number; y: number }>();

  for (const operation of operations) {
    if (operation.type === 'clear') {
      afterLastClear.length = 0;
      undone.clear();
      moved.clear();
      afterLastClear.push(operation);
      continue;
    }

    if (
      operation.type === 'undo' &&
      isUndoRedoData(operation.data)
    ) {
      undone.add(operation.data.targetOperationId);
      continue;
    }

    if (
      operation.type === 'redo' &&
      isUndoRedoData(operation.data)
    ) {
      undone.delete(operation.data.targetOperationId);
      continue;
    }

    if (operation.type === 'move' && isMoveData(operation.data)) {
      moved.set(operation.data.targetOperationId, {
        x: operation.data.x,
        y: operation.data.y,
      });
      continue;
    }

    afterLastClear.push(operation);
  }

  return afterLastClear
    .filter(
      (operation) =>
        !undone.has(operation.id) &&
        ['stroke', 'shape', 'text'].includes(operation.type),
    )
    .map((operation) => {
      if (operation.type !== 'text' || !isTextData(operation.data)) {
        return operation;
      }
      const nextPosition = moved.get(operation.id);
      if (!nextPosition) return operation;
      return {
        ...operation,
        data: {
          ...operation.data,
          x: nextPosition.x,
          y: nextPosition.y,
        },
      };
    });
};

export const getUndoneOperationIds = (operations: WhiteboardOperation[]) => {
  const undone = new Set<string>();

  for (const operation of operations) {
    if (operation.type === 'clear') undone.clear();
    if (operation.type === 'undo' && isUndoRedoData(operation.data)) {
      undone.add(operation.data.targetOperationId);
    }
    if (operation.type === 'redo' && isUndoRedoData(operation.data)) {
      undone.delete(operation.data.targetOperationId);
    }
  }

  return undone;
};

export const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
