jest.mock('server-only', () => ({}), { virtual: true });

import {
  BackendUnavailableError,
  fetchBackendApi,
  isBackendUnavailableError,
} from './backend';

describe('server backend prefetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('stops waiting for a cold backend after the prefetch timeout', async () => {
    global.fetch = jest.fn((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    );

    const request = fetchBackendApi('http://localhost:3001/api/workspaces');
    const assertion = expect(request).rejects.toBeInstanceOf(
      BackendUnavailableError,
    );

    await jest.advanceTimersByTimeAsync(1_500);
    await assertion;
  });

  it('recognizes serialized backend-unavailable errors', () => {
    expect(isBackendUnavailableError({ name: 'BackendUnavailableError' })).toBe(
      true,
    );
  });
});
