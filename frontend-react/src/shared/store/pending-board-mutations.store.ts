'use client';

import { create } from 'zustand';

export type BoardSocketEvent = 'task:update' | 'task:move' | 'task:reorder';
export type BoardSocketAckErrorCode =
  | 'permission_changed'
  | 'task_deleted'
  | 'column_deleted'
  | 'board_deleted'
  | 'task_already_moved'
  | 'task_order_conflict'
  | 'validation_failed'
  | 'unknown';

export type PendingBoardMutationStatus = 'pending' | 'conflict';

export type PendingBoardMutation = {
  id: string;
  boardId: string;
  event: BoardSocketEvent;
  payload: unknown;
  createdAt: number;
  expiresAt: number;
  status: PendingBoardMutationStatus;
  lastErrorCode?: BoardSocketAckErrorCode;
  lastErrorMessage?: string;
  failedAt?: number;
};

type PersistedPendingBoardMutations = {
  version: 1;
  mutations: PendingBoardMutation[];
};

interface PendingBoardMutationsState {
  mutations: PendingBoardMutation[];
  enqueue: (mutation: PendingBoardMutation) => void;
  remove: (id: string) => void;
  clear: () => void;
  markConflict: (
    id: string,
    conflict: {
      code: BoardSocketAckErrorCode;
      message?: string;
    },
  ) => void;
  pruneExpired: () => void;
}

export const PENDING_BOARD_MUTATIONS_STORAGE_KEY =
  'taskflow.pendingBoardMutations.v1';
export const PENDING_BOARD_MUTATION_TTL_MS = 1000 * 60 * 60 * 24;

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBoardSocketEvent = (value: unknown): value is BoardSocketEvent =>
  value === 'task:update' || value === 'task:move' || value === 'task:reorder';

const sanitizeMutation = (
  value: unknown,
): PendingBoardMutation | undefined => {
  if (!isRecord(value)) return undefined;

  const id = value.id;
  const boardId = value.boardId;
  const event = value.event;
  const createdAt = value.createdAt;
  const expiresAt = value.expiresAt;
  const status = value.status;
  const lastErrorCode = value.lastErrorCode;
  const lastErrorMessage = value.lastErrorMessage;
  const failedAt = value.failedAt;

  if (
    typeof id !== 'string' ||
    typeof boardId !== 'string' ||
    !isBoardSocketEvent(event) ||
    typeof createdAt !== 'number'
  ) {
    return undefined;
  }

  return {
    id,
    boardId,
    event,
    payload: value.payload,
    createdAt,
    expiresAt:
      typeof expiresAt === 'number'
        ? expiresAt
        : createdAt + PENDING_BOARD_MUTATION_TTL_MS,
    status: status === 'conflict' ? 'conflict' : 'pending',
    lastErrorCode:
      typeof lastErrorCode === 'string'
        ? (lastErrorCode as BoardSocketAckErrorCode)
        : undefined,
    lastErrorMessage:
      typeof lastErrorMessage === 'string' ? lastErrorMessage : undefined,
    failedAt: typeof failedAt === 'number' ? failedAt : undefined,
  };
};

export const pruneExpiredPendingBoardMutations = (
  mutations: PendingBoardMutation[],
  now = Date.now(),
) =>
  mutations
    .filter((mutation) => mutation.expiresAt > now)
    .sort((a, b) => a.createdAt - b.createdAt);

export const loadPersistedPendingBoardMutations = () => {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(PENDING_BOARD_MUTATIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<PersistedPendingBoardMutations>;
    const mutations = Array.isArray(parsed.mutations)
      ? parsed.mutations.map(sanitizeMutation).filter(Boolean)
      : [];

    return pruneExpiredPendingBoardMutations(
      mutations as PendingBoardMutation[],
    );
  } catch {
    return [];
  }
};

const persistPendingBoardMutations = (
  mutations: PendingBoardMutation[],
) => {
  if (!canUseLocalStorage()) return;

  try {
    if (!mutations.length) {
      window.localStorage.removeItem(PENDING_BOARD_MUTATIONS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PENDING_BOARD_MUTATIONS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        mutations,
      } satisfies PersistedPendingBoardMutations),
    );
  } catch {
    // The queue still works in memory if storage is unavailable or full.
  }
};

const commitMutations = (
  mutations: PendingBoardMutation[],
) => {
  const next = pruneExpiredPendingBoardMutations(mutations);
  persistPendingBoardMutations(next);
  return next;
};

export const usePendingBoardMutationsStore =
  create<PendingBoardMutationsState>((set) => ({
    mutations: loadPersistedPendingBoardMutations(),
    enqueue: (mutation) =>
      set((state) => ({
        mutations: commitMutations([
          ...state.mutations.filter((item) => item.id !== mutation.id),
          mutation,
        ]),
      })),
    remove: (id) =>
      set((state) => ({
        mutations: commitMutations(
          state.mutations.filter((mutation) => mutation.id !== id),
        ),
      })),
    clear: () => {
      persistPendingBoardMutations([]);
      set({ mutations: [] });
    },
    markConflict: (id, conflict) =>
      set((state) => ({
        mutations: commitMutations(
          state.mutations.map((mutation) =>
            mutation.id === id
              ? {
                  ...mutation,
                  status: 'conflict',
                  lastErrorCode: conflict.code,
                  lastErrorMessage: conflict.message,
                  failedAt: Date.now(),
                }
              : mutation,
          ),
        ),
      })),
    pruneExpired: () =>
      set((state) => ({
        mutations: commitMutations(state.mutations),
      })),
  }));
