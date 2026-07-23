import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { queryKeys } from '@/shared/queries/board-query-keys';
import { useOfflineBoardNavigationStore } from '@/shared/store/offline-board-navigation.store';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';
import OfflineNavigationGuard from './OfflineNavigationGuard';

const mockEnqueueSnackbar = jest.fn();

jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useIsOffline: () => true,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

const renderGuard = (queryClient: QueryClient, href: string) =>
  render(
    <QueryClientProvider client={queryClient}>
      <OfflineNavigationGuard />
      <a href={href}>navigate</a>
    </QueryClientProvider>,
  );

describe('OfflineNavigationGuard', () => {
  beforeEach(() => {
    useBackendAvailabilityStore.setState({ status: 'checking' });
  });

  afterEach(() => {
    useOfflineBoardNavigationStore.getState().clearSelection();
    mockEnqueueSnackbar.mockClear();
  });

  it('opens a cached board locally without document navigation', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.board('board-2'), {
      id: 'board-2',
      workspaceId: 'workspace-1',
    });
    renderGuard(
      queryClient,
      '/workspaces/workspace-1/boards/board-2',
    );

    const navigated = fireEvent.click(screen.getByText('navigate'));

    expect(navigated).toBe(false);
    expect(useOfflineBoardNavigationStore.getState().view).toEqual({
      type: 'board',
      boardId: 'board-2',
    });
  });

  it('opens the cached workspace catalog locally', () => {
    renderGuard(new QueryClient(), '/workspaces/workspace-1/boards');

    fireEvent.click(screen.getByText('navigate'));

    expect(useOfflineBoardNavigationStore.getState().view).toEqual({
      type: 'catalog',
      workspaceId: 'workspace-1',
    });
  });

  it('blocks an unsupported internal route without changing offline view', () => {
    renderGuard(new QueryClient(), '/');

    const navigated = fireEvent.click(screen.getByText('navigate'));

    expect(navigated).toBe(false);
    expect(useOfflineBoardNavigationStore.getState().view).toBeNull();
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'offlineSectionUnavailable',
      { variant: 'warning' },
    );
  });

  it('locks browser history before the App Router popstate handler', () => {
    const nativePushState = jest.spyOn(History.prototype, 'pushState');
    const laterPopStateHandler = jest.fn();
    renderGuard(new QueryClient(), '/workspaces');
    window.addEventListener('popstate', laterPopStateHandler);
    nativePushState.mockClear();

    window.dispatchEvent(
      new PopStateEvent('popstate', { state: window.history.state }),
    );

    expect(nativePushState).toHaveBeenCalledTimes(1);
    expect(laterPopStateHandler).not.toHaveBeenCalled();

    window.removeEventListener('popstate', laterPopStateHandler);
    nativePushState.mockRestore();
  });

  it('does not recreate the history lock after an unrelated rerender', () => {
    const queryClient = new QueryClient();
    const href = '/workspaces';
    const nativePushState = jest.spyOn(History.prototype, 'pushState');
    const view = renderGuard(queryClient, href);

    expect(nativePushState).toHaveBeenCalledTimes(1);

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <OfflineNavigationGuard />
        <a href={href}>navigate</a>
      </QueryClientProvider>,
    );

    expect(nativePushState).toHaveBeenCalledTimes(1);
    nativePushState.mockRestore();
  });

  it('does not lock App Router history while the backend is starting', () => {
    useBackendAvailabilityStore.setState({ status: 'starting' });
    const nativePushState = jest.spyOn(History.prototype, 'pushState');

    renderGuard(new QueryClient(), '/workspaces');

    expect(nativePushState).not.toHaveBeenCalled();
    nativePushState.mockRestore();
  });
});
