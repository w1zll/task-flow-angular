import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  syncOfflineDocumentLocale,
  warmOfflineNavigationRoutes,
} from '@/shared/lib/offline-navigation-cache';
import OfflineRuntime from './OfflineRuntime';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';

let mockOnlineStatus = true;

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));

jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus,
}));

jest.mock('@/shared/lib/offline-navigation-cache', () => ({
  syncOfflineDocumentAuthentication: jest.fn().mockResolvedValue(undefined),
  syncOfflineDocumentLocale: jest.fn().mockResolvedValue(undefined),
  warmOfflineNavigationRoutes: jest.fn().mockResolvedValue(undefined),
}));

const renderRuntime = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <OfflineRuntime />
    </QueryClientProvider>,
  );

describe('OfflineRuntime navigation cache warming', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockOnlineStatus = true;
    useBackendAvailabilityStore.setState({ status: 'ready' });
    global.fetch = jest.fn().mockResolvedValue({
      headers: { get: () => null },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('does not warm navigation routes for task comments cache updates', () => {
    const queryClient = new QueryClient();
    renderRuntime(queryClient);

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    (warmOfflineNavigationRoutes as jest.Mock).mockClear();

    act(() => {
      queryClient.setQueryData(queryKeys.taskComments('task-1'), []);
      jest.advanceTimersByTime(1500);
    });

    expect(warmOfflineNavigationRoutes).not.toHaveBeenCalled();
  });

  it('warms navigation routes when board data becomes available', () => {
    const queryClient = new QueryClient();
    renderRuntime(queryClient);

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    (warmOfflineNavigationRoutes as jest.Mock).mockClear();

    act(() => {
      queryClient.setQueryData(queryKeys.boards, [
        { id: 'board-1', workspaceId: 'workspace-1' },
      ]);
      queryClient.setQueryData(queryKeys.board('board-1'), {
        id: 'board-1',
        workspaceId: 'workspace-1',
      });
      jest.advanceTimersByTime(1500);
    });

    expect(warmOfflineNavigationRoutes).toHaveBeenCalledWith(
      expect.arrayContaining([
        '/workspaces',
        '/workspaces/workspace-1',
        '/workspaces/workspace-1/boards',
        '/workspaces/workspace-1/boards/board-1',
      ]),
    );
  });

  it('persists the current next-intl locale while online', () => {
    renderRuntime(new QueryClient());

    expect(syncOfflineDocumentLocale).toHaveBeenCalledWith('en');
  });

  it('replaces the offline banner while the backend is waking after reconnect', () => {
    mockOnlineStatus = false;
    useBackendAvailabilityStore.setState({ status: 'starting' });

    const { container } = renderRuntime(new QueryClient());

    expect(container.textContent).not.toContain('Offline:');
    expect(container.textContent).toContain('backendStartingTitle');
    expect(onlineManager.isOnline()).toBe(false);
  });

});
