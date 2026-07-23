import {
  PENDING_BOARD_MUTATION_TTL_MS,
  PENDING_BOARD_MUTATIONS_STORAGE_KEY,
  PendingBoardMutation,
  loadPersistedPendingBoardMutations,
  pruneExpiredPendingBoardMutations,
  usePendingBoardMutationsStore,
} from './pending-board-mutations.store';

const createMutation = (
  overrides: Partial<PendingBoardMutation> = {},
): PendingBoardMutation => {
  const createdAt = overrides.createdAt ?? Date.now();

  return {
    id: 'mutation-1',
    boardId: 'board-1',
    event: 'task:update',
    payload: { boardId: 'board-1', taskId: 'task-1' },
    createdAt,
    expiresAt: createdAt + PENDING_BOARD_MUTATION_TTL_MS,
    status: 'pending',
    ...overrides,
  };
};

describe('pending board mutations store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePendingBoardMutationsStore.setState({ mutations: [] });
  });

  it('persists queued mutations in localStorage', () => {
    const mutation = createMutation();

    usePendingBoardMutationsStore.getState().enqueue(mutation);

    const persisted = JSON.parse(
      window.localStorage.getItem(PENDING_BOARD_MUTATIONS_STORAGE_KEY) ?? '{}',
    );

    expect(usePendingBoardMutationsStore.getState().mutations).toEqual([
      mutation,
    ]);
    expect(persisted.mutations).toEqual([mutation]);
  });

  it('loads only valid non-expired persisted mutations', () => {
    const now = Date.now();
    const valid = createMutation({ id: 'valid', createdAt: now });
    const expired = createMutation({
      id: 'expired',
      createdAt: 1,
      expiresAt: 10,
    });

    window.localStorage.setItem(
      PENDING_BOARD_MUTATIONS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        mutations: [expired, { id: 123 }, valid],
      }),
    );

    expect(loadPersistedPendingBoardMutations()).toEqual([valid]);
  });

  it('marks a mutation conflict and persists it', () => {
    const mutation = createMutation();
    usePendingBoardMutationsStore.getState().enqueue(mutation);

    usePendingBoardMutationsStore.getState().markConflict(mutation.id, {
      code: 'permission_changed',
      message: 'No longer editable',
    });

    const [storedMutation] = JSON.parse(
      window.localStorage.getItem(PENDING_BOARD_MUTATIONS_STORAGE_KEY) ?? '{}',
    ).mutations;

    expect(usePendingBoardMutationsStore.getState().mutations[0]).toMatchObject({
      status: 'conflict',
      lastErrorCode: 'permission_changed',
      lastErrorMessage: 'No longer editable',
    });
    expect(storedMutation).toMatchObject({
      status: 'conflict',
      lastErrorCode: 'permission_changed',
    });
  });

  it('prunes expired mutations by ttl', () => {
    const active = createMutation({ id: 'active', expiresAt: 20 });
    const expired = createMutation({ id: 'expired', expiresAt: 10 });

    expect(pruneExpiredPendingBoardMutations([expired, active], 15)).toEqual([
      active,
    ]);
  });
});
