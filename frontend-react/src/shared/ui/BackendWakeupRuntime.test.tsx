import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { markNetworkOffline, markNetworkOnline } from '@/shared/lib/offline';
import { useBackendAvailabilityStore } from '@/shared/store/backend-availability.store';
import BackendWakeupRuntime from './BackendWakeupRuntime';

const mockEnqueueSnackbar = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

jest.mock('@/shared/lib/offline', () => ({
  markNetworkOffline: jest.fn(),
  markNetworkOnline: jest.fn(),
}));

const createHealthResponse = (options?: {
  ok?: boolean;
  status?: number;
  offline?: boolean;
}) =>
  ({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    headers: {
      get: (name: string) =>
        name === 'x-taskflow-offline-miss' && options?.offline ? '1' : null,
    },
  }) as Response;

const renderRuntime = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <BackendWakeupRuntime />
    </QueryClientProvider>,
  );

describe('BackendWakeupRuntime', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    useBackendAvailabilityStore.setState({ status: 'checking' });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('marks the backend ready without flashing the notice for a fast response', async () => {
    global.fetch = jest.fn().mockResolvedValue(createHealthResponse());

    await act(async () => {
      renderRuntime(new QueryClient());
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' }),
    );
    expect(useBackendAvailabilityStore.getState().status).toBe('ready');
    expect(markNetworkOnline).toHaveBeenCalled();
    expect(mockEnqueueSnackbar).not.toHaveBeenCalled();
  });

  it('sets the cold-start status and resumes automatically when ready', async () => {
    let resolveHealth!: (response: Response) => void;
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveHealth = resolve;
        }),
    );
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    renderRuntime(queryClient);

    act(() => {
      jest.advanceTimersByTime(1_500);
    });

    expect(useBackendAvailabilityStore.getState().status).toBe('starting');

    await act(async () => {
      resolveHealth(createHealthResponse());
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(useBackendAvailabilityStore.getState().status).toBe('ready');
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ refetchType: 'active' });
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith('backendReady', {
      variant: 'success',
    });
  });

  it('switches to offline mode for a service-worker offline response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createHealthResponse({ ok: false, status: 503, offline: true }));

    await act(async () => {
      renderRuntime(new QueryClient());
      await Promise.resolve();
    });

    expect(markNetworkOffline).toHaveBeenCalled();
    expect(markNetworkOnline).not.toHaveBeenCalled();
    expect(useBackendAvailabilityStore.getState().status).toBe('checking');
  });

  it('sets the startup status after reconnecting while the backend is asleep', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined));

    renderRuntime(new QueryClient());
    expect(global.fetch).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
      jest.advanceTimersByTime(1_500);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(useBackendAvailabilityStore.getState().status).toBe('starting');
  });

  it('retries immediate health-check failures every 2.5 seconds', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createHealthResponse({ ok: false, status: 500 }));

    await act(async () => {
      renderRuntime(new QueryClient());
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useBackendAvailabilityStore.getState().status).toBe('starting');

    await act(async () => {
      jest.advanceTimersByTime(2_499);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(2_499);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
