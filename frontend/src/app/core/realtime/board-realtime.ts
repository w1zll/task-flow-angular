import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Socket, io } from 'socket.io-client';

import { AuthApi } from '@core/api/clients/auth-api';
import { BoardResponseDto, TaskResponseDto, UpdateTaskDto } from '@core/api/generated';
import { BackendAvailabilityStore } from '@core/backend/backend-availability.store';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';
import { environment } from '@env/environment';

export type BoardRealtimeStatus =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'unavailable';

export type BoardSocketAckErrorCode =
  | 'permission_changed'
  | 'task_deleted'
  | 'column_deleted'
  | 'board_deleted'
  | 'task_already_moved'
  | 'task_order_conflict'
  | 'validation_failed'
  | 'unknown';

interface BoardSocketAck {
  readonly ok: boolean;
  readonly code?: BoardSocketAckErrorCode;
  readonly message?: string;
  readonly retryable?: boolean;
}

interface TaskEvent {
  readonly boardId: string;
  readonly task: TaskResponseDto;
}

interface TaskMovedEvent extends TaskEvent {
  readonly taskIdsByColumn?: Readonly<Record<string, readonly string[]>>;
}

interface TaskDeletedEvent {
  readonly boardId: string;
  readonly taskId: string;
}

interface TaskReorderedEvent {
  readonly boardId: string;
  readonly columnId: string;
  readonly taskIds: readonly string[];
}

interface ServerToClientEvents {
  'board:state': (board: BoardResponseDto) => void;
  'task:created': (payload: TaskEvent) => void;
  'task:update': (payload: TaskEvent) => void;
  'task:moved': (payload: TaskMovedEvent) => void;
  'task:deleted': (payload: TaskDeletedEvent) => void;
  'task:reordered': (payload: TaskReorderedEvent) => void;
}

interface ClientToServerEvents {
  'board:join': (payload: { readonly boardId: string }) => void;
  'board:leave': (payload: { readonly boardId: string }) => void;
}

type BoardSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type SocketMutationEvent = 'task:update' | 'task:move' | 'task:reorder';

const CONNECT_TIMEOUT_MS = 10_000;
const ACK_TIMEOUT_MS = 15_000;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000] as const;

export class BoardRealtimeAckError extends Error {
  readonly code: BoardSocketAckErrorCode;
  readonly retryable: boolean;

  constructor(response: BoardSocketAck) {
    super(response.message ?? 'Board socket mutation failed');
    this.name = 'BoardRealtimeAckError';
    this.code = response.code ?? 'unknown';
    this.retryable = response.retryable ?? true;
  }
}

export class BoardRealtimeUnavailableError extends Error {
  constructor(message = 'Board socket is unavailable') {
    super(message);
    this.name = 'BoardRealtimeUnavailableError';
  }
}

const mutationId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeTasks = (
  tasks: readonly TaskResponseDto[],
  taskIds?: readonly string[],
): TaskResponseDto[] => {
  if (!taskIds) {
    return [...tasks]
      .sort((left, right) => left.order - right.order)
      .map((task, order) => ({ ...task, order }));
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ordered = taskIds.flatMap((id, order) => {
    const task = byId.get(id);
    return task ? [{ ...task, order }] : [];
  });
  const orderedIds = new Set(taskIds);
  const remaining = [...tasks]
    .filter((task) => !orderedIds.has(task.id))
    .sort((left, right) => left.order - right.order)
    .map((task, index) => ({ ...task, order: ordered.length + index }));

  return [...ordered, ...remaining];
};

const removeTask = (board: BoardResponseDto, taskId: string): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) => ({
    ...column,
    tasks: normalizeTasks((column.tasks ?? []).filter((task) => task.id !== taskId)),
  })),
});

const upsertTask = (board: BoardResponseDto, task: TaskResponseDto): BoardResponseDto => {
  const withoutTask = removeTask(board, task.id);

  return {
    ...withoutTask,
    columns: (withoutTask.columns ?? []).map((column) =>
      column.id === task.columnId
        ? { ...column, tasks: normalizeTasks([...(column.tasks ?? []), task]) }
        : column,
    ),
  };
};

const moveTask = (board: BoardResponseDto, payload: TaskMovedEvent): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) => {
    const tasksWithoutMoved = (column.tasks ?? []).filter((task) => task.id !== payload.task.id);
    const tasks =
      column.id === payload.task.columnId
        ? [...tasksWithoutMoved, payload.task]
        : tasksWithoutMoved;

    return {
      ...column,
      tasks: normalizeTasks(tasks, payload.taskIdsByColumn?.[column.id]),
    };
  }),
});

const reorderTasks = (board: BoardResponseDto, payload: TaskReorderedEvent): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) =>
    column.id === payload.columnId
      ? { ...column, tasks: normalizeTasks(column.tasks ?? [], payload.taskIds) }
      : column,
  ),
});

@Injectable({
  providedIn: 'root',
})
export class BoardRealtime {
  private readonly authApi = inject(AuthApi);
  private readonly backend = inject(BackendAvailabilityStore);
  private readonly cache = inject(QueryCacheStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private socket: BoardSocket | null = null;
  private activeBoardId: string | null = null;
  private activation = 0;
  private connectPromise: Promise<BoardSocket> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;

  readonly status = signal<BoardRealtimeStatus>('idle');

  constructor() {
    if (!this.isBrowser) return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      this.stop();
    });
  }

  open(boardId: string): () => void {
    if (!this.isBrowser || !boardId) return () => undefined;

    const activation = ++this.activation;
    if (this.activeBoardId && this.activeBoardId !== boardId && this.socket?.connected) {
      this.socket.emit('board:leave', { boardId: this.activeBoardId });
    }
    this.activeBoardId = boardId;

    const socket = this.getSocket();
    if (socket.connected) {
      socket.emit('board:join', { boardId });
      this.status.set('connected');
    } else {
      void this.ensureConnected();
    }

    return () => {
      if (this.activation !== activation || this.activeBoardId !== boardId) return;
      if (socket.connected) socket.emit('board:leave', { boardId });
      this.activeBoardId = null;
      this.activation += 1;
      this.clearReconnect();
      socket.disconnect();
      this.connectPromise = null;
      this.status.set('idle');
    };
  }

  updateTask(boardId: string, taskId: string, changes: UpdateTaskDto): Promise<void> {
    this.assertActiveBoard(boardId);
    return this.emitMutation('task:update', {
      boardId,
      taskId,
      changes,
      idempotencyKey: mutationId(),
    });
  }

  moveTask(
    boardId: string,
    taskId: string,
    columnId: string,
    order: number,
    sourceColumnId: string,
  ): Promise<void> {
    this.assertActiveBoard(boardId);
    return this.emitMutation('task:move', {
      boardId,
      taskId,
      columnId,
      order,
      sourceColumnId,
      idempotencyKey: mutationId(),
    });
  }

  reorderTask(boardId: string, columnId: string, taskIds: readonly string[]): Promise<void> {
    this.assertActiveBoard(boardId);
    return this.emitMutation('task:reorder', {
      boardId,
      columnId,
      taskIds: [...taskIds],
      idempotencyKey: mutationId(),
    });
  }

  private readonly handleOnline = (): void => {
    if (this.activeBoardId) void this.ensureConnected();
  };

  private readonly handleOffline = (): void => {
    this.clearReconnect();
    this.socket?.disconnect();
    if (this.activeBoardId) this.status.set('unavailable');
  };

  private getSocket(): BoardSocket {
    if (this.socket) return this.socket;

    const origin = environment.socketUrl.replace(/\/+$/u, '');
    const socket = io(`${origin}/boards`, {
      autoConnect: false,
      withCredentials: true,
      reconnection: false,
      transports: ['websocket', 'polling'],
    }) as BoardSocket;

    socket.on('connect', () => {
      this.clearReconnect();
      this.reconnectAttempt = 0;
      this.status.set('connected');
      if (this.activeBoardId) {
        socket.emit('board:join', { boardId: this.activeBoardId });
      }
    });
    socket.on('connect_error', () => {
      if (!this.activeBoardId) return;
      this.status.set('reconnecting');
      this.scheduleReconnect();
    });
    socket.on('disconnect', () => {
      if (!this.activeBoardId) {
        this.status.set('idle');
        return;
      }
      this.status.set(navigator.onLine ? 'reconnecting' : 'unavailable');
      this.scheduleReconnect();
    });
    socket.on('board:state', (board) => {
      if (board.id !== this.activeBoardId) return;
      if (!this.cache.get(queryKeys.authUser)) return;
      this.cache.updateFromServer<BoardResponseDto>(queryKeys.boardDetail(board.id), () => board, {
        skipIfPending: true,
      });
      this.upsertCatalog(board, true);
    });
    socket.on('task:created', (payload) => {
      if (payload.boardId !== this.activeBoardId) return;
      this.patchBoard(payload.boardId, (board) => upsertTask(board, payload.task));
    });
    socket.on('task:update', (payload) => {
      if (payload.boardId !== this.activeBoardId) return;
      this.patchBoard(payload.boardId, (board) => upsertTask(board, payload.task));
    });
    socket.on('task:moved', (payload) => {
      if (payload.boardId !== this.activeBoardId) return;
      this.patchBoard(payload.boardId, (board) => moveTask(board, payload));
    });
    socket.on('task:deleted', (payload) => {
      if (payload.boardId !== this.activeBoardId) return;
      this.patchBoard(payload.boardId, (board) => removeTask(board, payload.taskId));
    });
    socket.on('task:reordered', (payload) => {
      if (payload.boardId !== this.activeBoardId) return;
      this.patchBoard(payload.boardId, (board) => reorderTasks(board, payload));
    });

    this.socket = socket;
    return socket;
  }

  private ensureConnected(): Promise<BoardSocket> {
    const socket = this.getSocket();
    if (socket.connected) return Promise.resolve(socket);
    if (!this.activeBoardId || !navigator.onLine) {
      return Promise.reject(new BoardRealtimeUnavailableError());
    }
    if (this.connectPromise) return this.connectPromise;

    this.status.set(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    const activation = this.activation;
    const promise = this.connect(socket, activation).finally(() => {
      if (this.connectPromise === promise) this.connectPromise = null;
    });
    this.connectPromise = promise;
    return promise;
  }

  private async connect(socket: BoardSocket, activation: number): Promise<BoardSocket> {
    try {
      await this.backend.waitUntilReady();
      if (activation !== this.activation || !this.activeBoardId || !navigator.onLine) {
        throw new BoardRealtimeUnavailableError();
      }

      const { token } = await firstValueFrom(this.authApi.websocketToken());
      if (activation !== this.activation || !this.activeBoardId || !navigator.onLine) {
        throw new BoardRealtimeUnavailableError();
      }
      socket.auth = { token };

      return await new Promise<BoardSocket>((resolve, reject) => {
        const cleanup = (): void => {
          clearTimeout(timeout);
          socket.off('connect', connected);
          socket.off('connect_error', failed);
        };
        const connected = (): void => {
          cleanup();
          if (activation === this.activation && this.activeBoardId) {
            resolve(socket);
          } else {
            reject(new BoardRealtimeUnavailableError());
          }
        };
        const failed = (error: Error): void => {
          cleanup();
          reject(error);
        };
        const timeout = setTimeout(() => {
          cleanup();
          socket.disconnect();
          reject(new BoardRealtimeUnavailableError('Board socket connection timed out'));
        }, CONNECT_TIMEOUT_MS);

        socket.once('connect', connected);
        socket.once('connect_error', failed);
        socket.connect();
      });
    } catch (error) {
      if (activation === this.activation && this.activeBoardId) {
        this.status.set(navigator.onLine ? 'reconnecting' : 'unavailable');
        this.scheduleReconnect();
      }
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (!this.activeBoardId || !navigator.onLine || this.reconnectTimer) return;

    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected().catch(() => undefined);
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async emitMutation(event: SocketMutationEvent, payload: object): Promise<void> {
    if (!this.activeBoardId || !navigator.onLine) {
      throw new BoardRealtimeUnavailableError();
    }

    const socket = await this.ensureConnected();
    if (!socket.connected) throw new BoardRealtimeUnavailableError();

    await new Promise<void>((resolve, reject) => {
      (socket.timeout(ACK_TIMEOUT_MS) as Socket).emit(
        event,
        payload,
        (error: Error | null, response?: BoardSocketAck) => {
          if (error) {
            this.discardBufferedWrites(socket);
            reject(new BoardRealtimeUnavailableError(error.message));
            return;
          }
          if (!response?.ok) {
            reject(new BoardRealtimeAckError(response ?? { ok: false }));
            return;
          }
          resolve();
        },
      );
    });
  }

  private assertActiveBoard(boardId: string): void {
    if (this.activeBoardId !== boardId) {
      throw new BoardRealtimeUnavailableError('The board socket room is not active');
    }
  }

  private patchBoard(
    boardId: string,
    updater: (board: BoardResponseDto) => BoardResponseDto,
  ): void {
    const detail = this.cache.get<BoardResponseDto>(queryKeys.boardDetail(boardId));
    if (!detail) return;

    this.cache.updateFromServer<BoardResponseDto>(queryKeys.boardDetail(boardId), (board) =>
      updater(board ?? detail),
    );
    this.upsertCatalog(updater(detail));
  }

  private upsertCatalog(board: BoardResponseDto, replace = false): void {
    if (!this.cache.get<readonly BoardResponseDto[]>(queryKeys.boardsCatalog)) return;

    this.cache.updateFromServer<readonly BoardResponseDto[]>(
      queryKeys.boardsCatalog,
      (boards = []) =>
        boards.map((current) =>
          current.id === board.id
            ? replace
              ? board
              : {
                  ...current,
                  columns: board.columns,
                  updatedAt: board.updatedAt,
                }
            : current,
        ),
      { skipIfPending: replace },
    );
  }

  private discardBufferedWrites(socket: BoardSocket): void {
    (socket as BoardSocket & { sendBuffer?: unknown[] }).sendBuffer = [];
  }

  private stop(): void {
    this.clearReconnect();
    if (this.activeBoardId && this.socket?.connected) {
      this.socket.emit('board:leave', { boardId: this.activeBoardId });
    }
    this.activeBoardId = null;
    this.connectPromise = null;
    this.socket?.disconnect();
    this.status.set('idle');
  }
}
