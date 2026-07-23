import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import {
  PENDING_BOARD_MUTATION_TTL_MS,
  PendingBoardMutation,
  usePendingBoardMutationsStore,
} from '@/shared/store/pending-board-mutations.store';
import {
  ensureSocketConnected,
  getSocket,
  isSocketReady,
} from '@/shared/lib/socket';
import PendingBoardMutationsPrompt from './PendingBoardMutationsPrompt';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));

jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('@/shared/lib/socket', () => ({
  ensureSocketConnected: jest.fn(),
  getSocket: jest.fn(),
  isSocketReady: jest.fn(),
}));

const createMutation = (): PendingBoardMutation => {
  const createdAt = Date.now();

  return {
    id: 'mutation-1',
    boardId: 'board-1',
    event: 'task:update',
    payload: {
      boardId: 'board-1',
      taskId: 'task-1',
      changes: { title: 'Next title' },
      idempotencyKey: 'mutation-1',
    },
    createdAt,
    expiresAt: createdAt + PENDING_BOARD_MUTATION_TTL_MS,
    status: 'pending',
  };
};

describe('PendingBoardMutationsPrompt', () => {
  const socket = {
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    window.localStorage.clear();
    usePendingBoardMutationsStore.setState({ mutations: [] });
    jest.clearAllMocks();
    (getSocket as jest.Mock).mockReturnValue(socket);
    (isSocketReady as jest.Mock).mockReturnValue(false);
    (ensureSocketConnected as jest.Mock).mockResolvedValue(socket);
  });

  afterEach(() => {
    usePendingBoardMutationsStore.setState({ mutations: [] });
  });

  it('shows queued changes after reconnect while the socket is still connecting', () => {
    const queryClient = new QueryClient();
    usePendingBoardMutationsStore.setState({
      mutations: [createMutation()],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PendingBoardMutationsPrompt />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(ensureSocketConnected).toHaveBeenCalledWith(socket);
    expect(
      (screen.getByRole('button', { name: 'apply' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
