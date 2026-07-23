import { Socket } from 'socket.io-client';
import {
  ensureSocketConnected,
  getSocket,
  isSocketReady,
} from './socket';
import {
  BoardSocketAckErrorCode,
  BoardSocketEvent,
  PENDING_BOARD_MUTATION_TTL_MS,
  PendingBoardMutation,
  usePendingBoardMutationsStore,
} from '../store/pending-board-mutations.store';
import { isBrowserOffline } from './offline';

type SocketAckResponse = {
  ok: boolean;
  code?: BoardSocketAckErrorCode;
  message?: string;
  retryable?: boolean;
};

type EmitBoardSocketMutationOptions = {
  boardId: string;
  queueOnFailure?: boolean;
};

const SOCKET_ACK_TIMEOUT_MS = 15_000;

export class BoardSocketMutationQueuedError extends Error {
  constructor(readonly mutation: PendingBoardMutation) {
    super('Board socket mutation queued');
    this.name = 'BoardSocketMutationQueuedError';
  }
}

export class BoardSocketAckError extends Error {
  readonly code: BoardSocketAckErrorCode;
  readonly retryable: boolean;

  constructor(response: SocketAckResponse) {
    super(response.message ?? 'Socket operation failed');
    this.name = 'BoardSocketAckError';
    this.code = response.code ?? 'unknown';
    this.retryable = response.retryable ?? true;
  }
}

const createMutationId = () =>
  `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const withIdempotencyKey = (payload: unknown, idempotencyKey: string) => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload)
  ) {
    const currentKey = (payload as { idempotencyKey?: unknown }).idempotencyKey;
    return {
      ...payload,
      idempotencyKey:
        typeof currentKey === 'string' && currentKey.trim()
          ? currentKey
          : idempotencyKey,
    };
  }

  return { value: payload, idempotencyKey };
};

const discardBufferedSocketWrites = (socket: Socket) => {
  const bufferedSocket = socket as Socket & {
    sendBuffer?: unknown[];
  };
  bufferedSocket.sendBuffer = [];
};

const createPendingMutation = (
  event: BoardSocketEvent,
  payload: unknown,
  boardId: string,
) => {
  const id = createMutationId();
  const createdAt = Date.now();

  return {
    id,
    boardId,
    event,
    payload: withIdempotencyKey(payload, id),
    createdAt,
    expiresAt: createdAt + PENDING_BOARD_MUTATION_TTL_MS,
    status: 'pending',
  } satisfies PendingBoardMutation;
};

const queueMutation = (mutation: PendingBoardMutation) => {
  usePendingBoardMutationsStore.getState().enqueue(mutation);
  return mutation;
};

const emitLiveBoardSocketMutation = async (
  event: BoardSocketEvent,
  payload: unknown,
) => {
  const socket = await ensureSocketConnected();

  if (!isSocketReady(socket)) {
    throw new Error('Socket is not ready');
  }

  await new Promise<void>((resolve, reject) => {
    socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit(
      event,
      payload,
      (error: Error | null, response?: SocketAckResponse) => {
        if (error) {
          reject(error);
          return;
        }

        if (!response?.ok) {
          reject(new BoardSocketAckError(response ?? { ok: false }));
          return;
        }

        resolve();
      },
    );
  });
};

export const emitBoardSocketMutation = async (
  event: BoardSocketEvent,
  payload: unknown,
  { boardId, queueOnFailure = true }: EmitBoardSocketMutationOptions,
) => {
  const mutation = createPendingMutation(event, payload, boardId);

  if (isBrowserOffline()) {
    queueMutation(mutation);
    throw new BoardSocketMutationQueuedError(mutation);
  }

  const socket = getSocket();

  try {
    await emitLiveBoardSocketMutation(event, mutation.payload);
  } catch (error) {
    if (error instanceof BoardSocketAckError) throw error;
    if (!queueOnFailure || isSocketReady(socket)) throw error;

    discardBufferedSocketWrites(socket);
    queueMutation(mutation);
    throw new BoardSocketMutationQueuedError(mutation);
  }
};

export const applyPendingBoardMutation = async (
  mutation: PendingBoardMutation,
) => {
  try {
    await emitLiveBoardSocketMutation(mutation.event, mutation.payload);
  } catch (error) {
    if (!(error instanceof BoardSocketAckError)) {
      const socket = getSocket();
      discardBufferedSocketWrites(socket);
    }
    throw error;
  }
};

export const isBoardSocketMutationQueuedError = (
  error: unknown,
): error is BoardSocketMutationQueuedError =>
  error instanceof BoardSocketMutationQueuedError;

export const isBoardSocketAckError = (
  error: unknown,
): error is BoardSocketAckError =>
  error instanceof BoardSocketAckError ||
  (error as { name?: string } | null)?.name === 'BoardSocketAckError';

export const getBoardSocketAckErrorCode = (
  error: unknown,
): BoardSocketAckErrorCode | undefined =>
  isBoardSocketAckError(error) ? error.code : undefined;

export const isBoardSocketConflictError = (error: unknown) =>
  isBoardSocketAckError(error) && !error.retryable;

export const isBoardPermissionError = (error: unknown) => {
  if (getBoardSocketAckErrorCode(error) === 'permission_changed') {
    return true;
  }

  const status = (error as { response?: { status?: number } })?.response?.status;
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown })?.message ?? '');

  return (
    status === 403 ||
    /permission|only the board owner|do not have access/i.test(message)
  );
};
