import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
  QueryClient,
  dehydrate,
  useIsRestoring,
  useQuery,
} from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  persistQueryClientRestore,
  type PersistedClient,
  type Persister,
} from '@tanstack/react-query-persist-client';
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  normalizePersistedClient,
  settleWithin,
  shouldPersistQuery,
} from './query-persistence';

const createPersistedClient = (
  client: QueryClient,
  overrides: Partial<PersistedClient> = {},
): PersistedClient => ({
  buster: QUERY_CACHE_BUSTER,
  timestamp: Date.now(),
  clientState: dehydrate(client),
  ...overrides,
});

const createMemoryPersister = (initial?: PersistedClient) => {
  let stored = initial;
  const persister: Persister = {
    persistClient: jest.fn((client: PersistedClient) => {
      stored = client;
    }),
    restoreClient: jest.fn(() => stored),
    removeClient: jest.fn(() => {
      stored = undefined;
    }),
  };

  return { persister, getStored: () => stored };
};

describe('query persistence', () => {
  it('migrates the legacy offline cache envelope without losing queries', () => {
    const source = new QueryClient();
    source.setQueryData(['boards'], [{ id: 'board-1' }]);
    const legacyState = dehydrate(source);

    expect(
      normalizePersistedClient({
        buster: 'taskflow-pwa-readonly-offline-v1',
        timestamp: 123,
        state: legacyState,
      }),
    ).toEqual({
      buster: QUERY_CACHE_BUSTER,
      timestamp: 123,
      clientState: legacyState,
    });
  });

  it('persists only successful offline-readable workspace and board queries', () => {
    const client = new QueryClient();
    client.setQueryData(['boards'], [{ id: 'board-1' }]);
    client.setQueryData(['workspaces', 'workspace-1', 'teams'], []);
    client.setQueryData(['workspaces', 'workspace-1', 'invites'], []);

    const boards = client.getQueryCache().find({ queryKey: ['boards'] });
    const teams = client.getQueryCache().find({
      queryKey: ['workspaces', 'workspace-1', 'teams'],
    });
    const invites = client.getQueryCache().find({
      queryKey: ['workspaces', 'workspace-1', 'invites'],
    });

    expect(boards && shouldPersistQuery(boards)).toBe(true);
    expect(teams && shouldPersistQuery(teams)).toBe(true);
    expect(invites && shouldPersistQuery(invites)).toBe(false);
  });

  it.each([
    ['expired', { timestamp: Date.now() - QUERY_CACHE_MAX_AGE_MS - 1 }],
    ['busted', { buster: 'old-cache-version' }],
  ])('removes a %s cache instead of hydrating it', async (_, overrides) => {
    const source = new QueryClient();
    source.setQueryData(['boards'], [{ id: 'board-1' }]);
    const { persister, getStored } = createMemoryPersister(
      createPersistedClient(source, overrides),
    );
    const target = new QueryClient();

    await persistQueryClientRestore({
      queryClient: target,
      persister,
      buster: QUERY_CACHE_BUSTER,
      maxAge: QUERY_CACHE_MAX_AGE_MS,
    });

    expect(getStored()).toBeUndefined();
    expect(target.getQueryData(['boards'])).toBeUndefined();
  });

  it('removes a cache when restoration throws', async () => {
    const removeClient = jest.fn();
    const persister: Persister = {
      persistClient: jest.fn(),
      restoreClient: jest.fn(() => {
        throw new Error('corrupt cache');
      }),
      removeClient,
    };
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

    await expect(
      persistQueryClientRestore({
        queryClient: new QueryClient(),
        persister,
      }),
    ).rejects.toThrow('corrupt cache');

    expect(removeClient).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('stops waiting when IndexedDB restoration never settles', async () => {
    jest.useFakeTimers();
    const restoration = settleWithin(
      new Promise<PersistedClient>(() => undefined),
      100,
      undefined,
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await expect(restoration).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  it('releases PersistQueryClientProvider after a restoration timeout', async () => {
    jest.useFakeTimers();
    const persister: Persister = {
      persistClient: jest.fn(),
      restoreClient: () =>
        settleWithin(
          new Promise<PersistedClient>(() => undefined),
          100,
          undefined,
        ),
      removeClient: jest.fn(),
    };
    const Content = () => (
      <div>{useIsRestoring() ? 'restoring' : 'ready'}</div>
    );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PersistQueryClientProvider
          client={new QueryClient()}
          persistOptions={{ persister }}
        >
          <Content />
        </PersistQueryClientProvider>,
      );
    });
    expect(container.textContent).toBe('restoring');

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(container.textContent).toBe('ready');

    await act(async () => root.unmount());
    jest.useRealTimers();
  });

  it('rejects malformed dehydrated cache envelopes', () => {
    expect(
      normalizePersistedClient({
        buster: QUERY_CACHE_BUSTER,
        timestamp: Date.now(),
        clientState: { queries: 'not-an-array' },
      }),
    ).toBeUndefined();
    expect(
      normalizePersistedClient({
        buster: QUERY_CACHE_BUSTER,
        timestamp: Date.now(),
        clientState: { queries: [{}] },
      }),
    ).toBeUndefined();
  });

  it('keeps the first client render equal to SSR while restoring warm data', async () => {
    const source = new QueryClient();
    source.setQueryData(['boards'], [{ id: 'board-1' }]);
    const { persister } = createMemoryPersister(createPersistedClient(source));
    const client = new QueryClient();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const Content = () => {
      const query = useQuery({
        queryKey: ['boards'],
        queryFn: () => new Promise<never>(() => undefined),
      });
      return <div>{query.data ? 'cached' : 'loading'}</div>;
    };
    const App = () => (
      <PersistQueryClientProvider
        client={client}
        persistOptions={{
          persister,
          buster: QUERY_CACHE_BUSTER,
          maxAge: QUERY_CACHE_MAX_AGE_MS,
        }}
      >
        <Content />
      </PersistQueryClientProvider>
    );

    const container = document.createElement('div');
    container.innerHTML = renderToString(<App />);
    expect(container.textContent).toBe('loading');

    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, <App />);
      await Promise.resolve();
    });

    expect(container.textContent).toBe('cached');
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes('Hydration failed'),
      ),
    ).toBe(false);

    await act(async () => root?.unmount());
    consoleError.mockRestore();
  });
});
