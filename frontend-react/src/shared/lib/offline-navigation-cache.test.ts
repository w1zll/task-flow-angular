import {
  clearOfflineApplicationCaches,
  hasCachedOfflineNavigationRoute,
  OFFLINE_ROUTES_WARMED_EVENT,
  syncOfflineDocumentAuthentication,
  syncOfflineDocumentLocale,
  warmOfflineNavigationRoutes,
} from './offline-navigation-cache';
import {
  MATCH_OFFLINE_NAVIGATION_ROUTE,
  OFFLINE_DOCUMENT_PREFERENCES_CACHE,
  WARM_OFFLINE_NAVIGATION_ROUTES,
} from './pwa-cache-names';

class MockMessagePort {
  peer?: MockMessagePort;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;

  postMessage(data: unknown) {
    this.peer?.onmessage?.({ data } as MessageEvent);
  }

  close() {}
}

class MockMessageChannel {
  port1 = new MockMessagePort();
  port2 = new MockMessagePort();

  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}

class MockResponse {
  constructor(private readonly body: string) {}

  async text() {
    return this.body;
  }
}

describe('offline navigation cache', () => {
  const originalCaches = window.caches;
  const originalMessageChannel = global.MessageChannel;
  const originalResponse = global.Response;
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    navigator,
    'serviceWorker',
  );
  const cache = { match: jest.fn(), put: jest.fn().mockResolvedValue(undefined) };
  const open = jest.fn().mockResolvedValue(cache);
  const keys = jest.fn().mockResolvedValue([]);
  const deleteCache = jest.fn().mockResolvedValue(true);
  const controller = { postMessage: jest.fn() };
  const getRegistration = jest.fn().mockResolvedValue({ active: controller });

  const setServiceWorkerController = (
    value: typeof controller | null,
  ) => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { controller: value, getRegistration },
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    global.MessageChannel =
      MockMessageChannel as unknown as typeof MessageChannel;
    global.Response = MockResponse as unknown as typeof Response;
    setServiceWorkerController(controller);
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { delete: deleteCache, keys, open },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.MessageChannel = originalMessageChannel;
    global.Response = originalResponse;
    if (originalServiceWorker) {
      Object.defineProperty(
        navigator,
        'serviceWorker',
        originalServiceWorker,
      );
    } else {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: originalCaches,
    });
  });

  it('asks the active worker to warm normalized authenticated routes', async () => {
    controller.postMessage.mockImplementation((_message, ports) => {
      (ports[0] as MockMessagePort).postMessage({ ok: true });
    });
    const warmedListener = jest.fn();
    window.addEventListener(OFFLINE_ROUTES_WARMED_EVENT, warmedListener);

    await warmOfflineNavigationRoutes([
      '/workspaces?view=all#ignored',
      '/workspaces?view=all',
      'https://example.com/workspaces',
      '/auth/login',
    ]);

    expect(controller.postMessage).toHaveBeenCalledWith(
      {
        type: WARM_OFFLINE_NAVIGATION_ROUTES,
        routes: ['/workspaces?view=all'],
      },
      [expect.any(MockMessagePort)],
    );
    expect(warmedListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OFFLINE_ROUTES_WARMED_EVENT, warmedListener);
  });

  it('stores locale and authentication context outside user-scoped caches', async () => {
    await syncOfflineDocumentLocale('en');
    await syncOfflineDocumentAuthentication(true);

    expect(open).toHaveBeenCalledWith(OFFLINE_DOCUMENT_PREFERENCES_CACHE);
    expect(cache.put).toHaveBeenCalledTimes(2);

    const [localeKey, localeResponse] = cache.put.mock.calls[0] as [
      string,
      Response,
    ];
    const [authenticationKey, authenticationResponse] = cache.put.mock
      .calls[1] as [string, Response];

    expect(localeKey).toContain('/__taskflow/offline-document-locale');
    await expect(localeResponse.text()).resolves.toBe('en');
    expect(authenticationKey).toContain(
      '/__taskflow/offline-document-authentication',
    );
    await expect(authenticationResponse.text()).resolves.toBe('1');
  });

  it('ignores an unsupported offline document locale', async () => {
    await syncOfflineDocumentLocale('de');

    expect(cache.put).not.toHaveBeenCalled();
  });

  it('bounds a worker warm request that never acknowledges', async () => {
    const warming = warmOfflineNavigationRoutes(['/workspaces']);
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(30_000);

    await expect(warming).resolves.toBeUndefined();
  });

  it('checks only the controlling worker build cache when controlled', async () => {
    controller.postMessage.mockImplementation((message, ports) => {
      expect(message).toEqual({
        type: MATCH_OFFLINE_NAVIGATION_ROUTE,
        route: '/workspaces/123/boards/456',
      });
      (ports[0] as MockMessagePort).postMessage({ ok: true, cached: true });
    });

    await expect(
      hasCachedOfflineNavigationRoute('/workspaces/123/boards/456'),
    ).resolves.toBe(true);
    expect(keys).not.toHaveBeenCalled();
  });

  it('can inspect a legacy cache before the page is controlled', async () => {
    setServiceWorkerController(null);
    getRegistration.mockResolvedValueOnce(undefined);
    keys.mockResolvedValueOnce(['taskflow-pwa-readonly-offline-v4-pages']);
    cache.match.mockResolvedValueOnce(undefined).mockResolvedValueOnce({});

    await expect(
      hasCachedOfflineNavigationRoute('/workspaces/123/boards/456'),
    ).resolves.toBe(true);
  });

  it('clears user-scoped HTML and data caches but keeps the precache', async () => {
    keys.mockResolvedValue([
      'taskflow-precache-v2-production',
      'taskflow-pwa-navigation-pages-build-abc',
      'taskflow-pwa-readonly-offline-v4-pages',
      'pages-rsc',
      'apis',
      OFFLINE_DOCUMENT_PREFERENCES_CACHE,
    ]);

    await clearOfflineApplicationCaches();

    expect(deleteCache).toHaveBeenCalledTimes(4);
    expect(deleteCache).toHaveBeenCalledWith(
      'taskflow-pwa-navigation-pages-build-abc',
    );
    expect(deleteCache).toHaveBeenCalledWith(
      'taskflow-pwa-readonly-offline-v4-pages',
    );
    expect(deleteCache).toHaveBeenCalledWith('pages-rsc');
    expect(deleteCache).toHaveBeenCalledWith('apis');
    expect(deleteCache).not.toHaveBeenCalledWith(
      'taskflow-precache-v2-production',
    );
    expect(deleteCache).not.toHaveBeenCalledWith(
      OFFLINE_DOCUMENT_PREFERENCES_CACHE,
    );
  });
});
